// server/src/routes/organization.js — Phase 5
const express = require("express");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { isSuperAdmin, isAdmin } = require("../middleware/rbac");

const router = express.Router();
const prisma = new PrismaClient();

// Logo upload setup
const LOGO_DIR = path.join(__dirname, "../../uploads/org");
fs.mkdirSync(LOGO_DIR, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, LOGO_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${uuidv4()}${ext}`);
  },
});
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (["image/png","image/jpeg","image/svg+xml","image/webp"].includes(file.mimetype))
      cb(null, true);
    else cb(new Error("Only PNG, JPG, SVG or WEBP images allowed"), false);
  },
});

// ── Helper: get or create singleton org settings ──────────────────────────────
async function getOrCreate() {
  const existing = await prisma.organizationSettings.findFirst();
  if (existing) return existing;
  return prisma.organizationSettings.create({ data: {} });
}

// ── GET /api/organization — public (all authenticated staff can read) ─────────
router.get("/", authenticate, async (req, res, next) => {
  try {
    const settings = await getOrCreate();
    res.json({ settings });
  } catch (err) { next(err); }
});

// ── PATCH /api/organization — update settings (Super Admin only) ──────────────
router.patch("/", authenticate, isSuperAdmin, [
  body("name").optional().trim().isLength({ min: 2, max: 100 }),
  body("slogan").optional().trim().isLength({ max: 200 }),
  body("accentColor").optional().trim().matches(/^#[0-9A-Fa-f]{6}$/),
  body("contactEmail").optional().isEmail(),
  body("contactPhone").optional().trim(),
  body("address").optional().trim().isLength({ max: 300 }),
  body("website").optional().trim().isURL(),
  body("welcomeMessage").optional().trim().isLength({ max: 1000 }),
  body("maxFileSize").optional().isInt({ min: 1, max: 100 }),
  body("maintenanceMode").optional().isBoolean(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const settings = await getOrCreate();
    const {
      name, slogan, accentColor, contactEmail, contactPhone,
      address, website, welcomeMessage, maxFileSize, maintenanceMode,
    } = req.body;

    const updated = await prisma.organizationSettings.update({
      where: { id: settings.id },
      data: {
        ...(name             !== undefined && { name }),
        ...(slogan           !== undefined && { slogan }),
        ...(accentColor      !== undefined && { accentColor }),
        ...(contactEmail     !== undefined && { contactEmail }),
        ...(contactPhone     !== undefined && { contactPhone }),
        ...(address          !== undefined && { address }),
        ...(website          !== undefined && { website }),
        ...(welcomeMessage   !== undefined && { welcomeMessage }),
        ...(maxFileSize      !== undefined && { maxFileSize: parseInt(maxFileSize) }),
        ...(maintenanceMode  !== undefined && { maintenanceMode: !!maintenanceMode }),
        updatedById: req.user.id,
      },
    });

    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "ORG_SETTINGS_UPDATED",
        meta: { fields: Object.keys(req.body) } },
    });

    // Broadcast updated settings to all clients
    req.app.get("io")?.emit("org:settings:updated", updated);

    res.json({ settings: updated });
  } catch (err) { next(err); }
});

// ── POST /api/organization/logo — upload logo (Super Admin only) ──────────────
router.post("/logo", authenticate, isSuperAdmin,
  logoUpload.single("logo"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const settings = await getOrCreate();
      const logoUrl  = `/uploads/org/${req.file.filename}`;

      // Delete old logo from disk if exists
      if (settings.logoUrl) {
        const oldFile = path.join(LOGO_DIR, path.basename(settings.logoUrl));
        fs.unlink(oldFile, () => {});
      }

      const updated = await prisma.organizationSettings.update({
        where: { id: settings.id },
        data: { logoUrl, updatedById: req.user.id },
      });

      await prisma.auditLog.create({
        data: { adminId: req.user.id, action: "ORG_LOGO_UPDATED" },
      });

      req.app.get("io")?.emit("org:settings:updated", updated);
      res.json({ logoUrl, settings: updated });
    } catch (err) { next(err); }
  }
);

// ── DELETE /api/organization/logo — remove logo ───────────────────────────────
router.delete("/logo", authenticate, isSuperAdmin, async (req, res, next) => {
  try {
    const settings = await getOrCreate();
    if (settings.logoUrl) {
      const oldFile = path.join(LOGO_DIR, path.basename(settings.logoUrl));
      fs.unlink(oldFile, () => {});
    }
    const updated = await prisma.organizationSettings.update({
      where: { id: settings.id },
      data: { logoUrl: null, updatedById: req.user.id },
    });
    req.app.get("io")?.emit("org:settings:updated", updated);
    res.json({ message: "Logo removed", settings: updated });
  } catch (err) { next(err); }
});

module.exports = router;
