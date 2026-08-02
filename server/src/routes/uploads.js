// server/src/routes/uploads.js — Phase 2
const express  = require("express");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const { v4: uuidv4 } = require("uuid");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

const ALLOWED_MIME = {
  "image/jpeg":  { dir: "images",    ext: ".jpg"  },
  "image/png":   { dir: "images",    ext: ".png"  },
  "image/gif":   { dir: "images",    ext: ".gif"  },
  "image/webp":  { dir: "images",    ext: ".webp" },
  "application/pdf":   { dir: "documents", ext: ".pdf"  },
  "application/msword":{ dir: "documents", ext: ".doc"  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":{ dir:"documents",ext:".docx"},
  "application/vnd.ms-excel":{ dir: "documents", ext: ".xls" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":{ dir:"documents",ext:".xlsx"},
  "text/plain":  { dir: "documents", ext: ".txt" },
  "text/csv":    { dir: "documents", ext: ".csv" },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UPLOAD_BASE   = path.join(__dirname, "../../../uploads");
["images","documents"].forEach(d => fs.mkdirSync(path.join(UPLOAD_BASE, d), { recursive: true }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const info = ALLOWED_MIME[file.mimetype];
    cb(null, path.join(UPLOAD_BASE, info ? info.dir : "documents"));
  },
  filename: (req, file, cb) => {
    const info = ALLOWED_MIME[file.mimetype];
    const ext  = info?.ext || path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => ALLOWED_MIME[file.mimetype] ? cb(null, true) : cb(new Error(`File type not allowed: ${file.mimetype}`), false),
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
});

const buildUrl = (req, filename, mimeType) => {
  const info  = ALLOWED_MIME[mimeType];
  const subdir = info?.dir || "documents";
  const base  = process.env.SERVER_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${subdir}/${filename}`;
};

// POST /api/uploads/message/:channelId
router.post("/message/:channelId", authenticate, upload.array("files", 5), async (req, res, next) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: "No files uploaded" });
    const { channelId } = req.params;
    const isMember = req.user.role === "SUPER_ADMIN" || await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: req.user.id, channelId } },
    });
    if (!isMember) return res.status(403).json({ error: "Not a member of this channel" });

    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: { content: req.body.content?.trim() || "", type: "MESSAGE", channelId, authorId: req.user.id },
      });
      const attachments = await Promise.all(req.files.map(file =>
        tx.attachment.create({
          data: { filename: file.filename, originalName: file.originalname, mimeType: file.mimetype, size: file.size, url: buildUrl(req, file.filename, file.mimetype), messageId: message.id },
        })
      ));
      return { message, attachments };
    });

    const fullMessage = await prisma.message.findUnique({
      where: { id: result.message.id },
      include: { author: { select: { id:true, name:true, staffId:true, role:true, avatar:true } }, attachments: true, reactions: true, _count: { select: { replies: true } } },
    });

    req.app.get("io").to(`channel:${channelId}`).emit("message:new", fullMessage);
    res.status(201).json({ message: fullMessage });
  } catch (err) {
    req.files?.forEach(f => fs.unlink(f.path, () => {}));
    next(err);
  }
});

// DELETE /api/uploads/:attachmentId
router.delete("/:attachmentId", authenticate, async (req, res, next) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.attachmentId },
      include: { message: { select: { authorId: true } } },
    });
    if (!attachment) return res.status(404).json({ error: "Not found" });
    const canDelete = attachment.message.authorId === req.user.id || ["SUPER_ADMIN","STATE_ADMIN","DEPT_ADMIN"].includes(req.user.role);
    if (!canDelete) return res.status(403).json({ error: "Not allowed" });
    const filePath = path.join(UPLOAD_BASE, attachment.url.split("/uploads/")[1]);
    fs.unlink(filePath, () => {});
    await prisma.attachment.delete({ where: { id: attachment.id } });
    res.json({ message: "Deleted" });
  } catch (err) { next(err); }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File too large. Max 10 MB." });
    if (err.code === "LIMIT_FILE_COUNT") return res.status(400).json({ error: "Max 5 files per upload." });
    return res.status(400).json({ error: err.message });
  }
  if (err.message?.startsWith("File type not allowed")) return res.status(400).json({ error: err.message });
  next(err);
});

module.exports = router;
