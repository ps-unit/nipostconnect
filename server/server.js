// NiPOST Connect v6 — Production-ready Main Server
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
require("dotenv").config();
const { validateEnv } = require("./src/utils/validateEnv");
validateEnv(); // ← Fail fast if required env vars are missing

const express  = require("express");
const http     = require("http");
const path     = require("path");
const cors     = require("cors");
const helmet   = require("helmet");
const morgan   = require("morgan");
const rateLimit = require("express-rate-limit");
const { PrismaClient } = require("@prisma/client");
const initSocket = require("./src/socket");
const { initScheduler } = require("./src/utils/scheduler");
const { initSentry, sentryRequestHandler, sentryErrorHandler, captureException } = require("./src/utils/sentry");
const { startDbProxy } = require("./src/utils/dbProxy");
const { ensureSeeded } = require("./src/utils/seed");

// ── All routes ────────────────────────────────────────────────────────────────
const authRoutes         = require("./src/routes/auth");
const passwordResetRoutes= require("./src/routes/passwordreset");  // Phase 6
const userRoutes         = require("./src/routes/users");
const channelRoutes      = require("./src/routes/channels");
const messageRoutes      = require("./src/routes/messages");
const pollRoutes         = require("./src/routes/polls");
const adminRoutes        = require("./src/routes/admin");
const dmRoutes           = require("./src/routes/dms");
const uploadRoutes       = require("./src/routes/uploads");
const notifRoutes        = require("./src/routes/notifications");
const analyticsRoutes    = require("./src/routes/analytics");
const scheduledRoutes    = require("./src/routes/scheduled");
const bulkRoutes         = require("./src/routes/bulk");
const hrmisRoutes        = require("./src/routes/hrmis");
const searchRoutes       = require("./src/routes/search");
const voiceRoutes        = require("./src/routes/voice");
const twofaRoutes        = require("./src/routes/twofa");
const smsRoutes          = require("./src/routes/sms");
const reportsRoutes      = require("./src/routes/reports");
const aiRoutes           = require("./src/routes/ai");
const departmentRoutes   = require("./src/routes/departments");
const orgRoutes          = require("./src/routes/organization");
const profileRoutes      = require("./src/routes/profile");

const prisma = new PrismaClient();
const app    = express();
const server = http.createServer(app);

// ── Sentry must be initialised before other middleware ────────────────────────
initSentry(app);
app.use(sentryRequestHandler());

const io = initSocket(server);
app.set("io", io);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  hsts: process.env.NODE_ENV === "production"
    ? { maxAge: 63072000, includeSubDomains: true, preload: true }
    : false,
}));
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://nipostconnect.netlify.app",
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",").map(s => s.trim().replace(/\/$/, "")) : []),
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const clean = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(clean) || clean.endsWith(".netlify.app")) {
      return cb(null, true);
    }
    return cb(null, true);
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "7d", etag: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads"), { maxAge: "7d", etag: true }));

// Trust reverse proxy (Nginx) for real IP in rate limiter
app.set("trust proxy", 1);

const globalLimiter  = rateLimit({ windowMs:15*60*1000, max:300, standardHeaders:true, legacyHeaders:false });
const authLimiter    = rateLimit({ windowMs:15*60*1000, max:20, message:{ error:"Too many attempts." } });
const resetLimiter   = rateLimit({ windowMs:60*60*1000, max:5,  message:{ error:"Too many reset requests." } });
const uploadLimiter  = rateLimit({ windowMs:60*1000,    max:20 });
const aiLimiter      = rateLimit({ windowMs:60*1000,    max:10, message:{ error:"AI rate limit" } });

app.use(globalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",          authLimiter,  authRoutes);
app.use("/api/auth",          resetLimiter, passwordResetRoutes);  // Phase 6
app.use("/api/users",                       userRoutes);
app.use("/api/channels",                    channelRoutes);
app.use("/api/messages",                    messageRoutes);
app.use("/api/polls",                       pollRoutes);
app.use("/api/admin",                       adminRoutes);
app.use("/api/dms",                         dmRoutes);
app.use("/api/uploads",    uploadLimiter,   uploadRoutes);
app.use("/api/notifications",               notifRoutes);
app.use("/api/analytics",                   analyticsRoutes);
app.use("/api/scheduled",                   scheduledRoutes);
app.use("/api/bulk",                        bulkRoutes);
app.use("/api/hrmis",                       hrmisRoutes);
app.use("/api/search",                      searchRoutes);
app.use("/api/voice",                       voiceRoutes);
app.use("/api/2fa",                         twofaRoutes);
app.use("/api/sms",                         smsRoutes);
app.use("/api/reports",                     reportsRoutes);
app.use("/api/ai",         aiLimiter,       aiRoutes);
app.use("/api/departments",                 departmentRoutes);
app.use("/api/organization",                orgRoutes);
app.use("/api/profile",                     profileRoutes);

app.get("/api/health", async (req, res) => {
  let dbOk = false;
  try { await prisma.$queryRaw`SELECT 1`; dbOk = true; } catch {}
  res.json({
    status: "ok", version: "6.0.0", dbConnected: dbOk,
    uptime: Math.round(process.uptime()),
    timestamp: new Date(),
  });
});

// ── Error handling ────────────────────────────────────────────────────────────
app.use(sentryErrorHandler()); // Must be before other error handlers
app.use((req, res) => res.status(404).json({ error: "Endpoint not found" }));
app.use((err, req, res, next) => {
  captureException(err, { url: req.url, method: req.method });
  console.error("[ERROR]", err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" ? "An internal error occurred" : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  try {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("127.0.0.1:5433")) {
      await startDbProxy();
    }
    await prisma.$connect();
    console.log("   Database    : ✅ Connected");
    await ensureSeeded(prisma);
    initScheduler(io);
  } catch (e) {
    console.error("   Database    : ❌", e.message);
  }
  console.log("\n✅ NiPOST Connect v6 ready on port", PORT, "\n");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Shutdown] SIGTERM received");
  server.close(async () => {
    await prisma.$disconnect();
    console.log("[Shutdown] Clean exit");
    process.exit(0);
  });
});

module.exports = { app, server, prisma };
