// server/src/routes/hrmis.js — Phase 3
// Bulk staff import via CSV upload
const express = require("express");
const multer  = require("multer");
const bcrypt  = require("bcryptjs");
const { parse } = require("csv-parse");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { isAdmin } = require("../middleware/rbac");

const router = express.Router();
const prisma = new PrismaClient();

// In-memory multer — CSV/Excel goes to buffer, not disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (["text/csv","application/csv","text/plain"].includes(file.mimetype) ||
        file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are supported"), false);
    }
  },
});

// GET /api/hrmis/template — download CSV template
router.get("/template", authenticate, isAdmin, (req, res) => {
  const headers = "name,staffId,email,phone,stateCode,departmentSlug,postOffice,role\n";
  const example = "Aminu Ibrahim,NPS/KN/2025/001,aminu.ibrahim@nglosa.com,+2348012345678,KN,ict,Kano Central PO,STAFF\n";
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=nipost_staff_import_template.csv");
  res.send(headers + example);
});

// GET /api/hrmis/imports — import history
router.get("/imports", authenticate, isAdmin, async (req, res, next) => {
  try {
    const imports = await prisma.staffImport.findMany({
      include: { uploadedBy: { select: { name: true, staffId: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({ imports });
  } catch (err) { next(err); }
});

// POST /api/hrmis/preview — parse CSV, return rows for review (no DB writes)
router.post("/preview", authenticate, isAdmin, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "CSV file required" });

    const rows = await parseCSV(req.file.buffer.toString("utf-8"));
    const [states, departments] = await Promise.all([
      prisma.state.findMany({ select: { id: true, name: true, code: true } }),
      prisma.department.findMany({ select: { id: true, name: true, slug: true } }),
    ]);

    const stateMap = {}; states.forEach(s => { stateMap[s.code.toUpperCase()] = s; });
    const deptMap  = {}; departments.forEach(d => { deptMap[d.slug.toLowerCase()] = d; });

    const preview = rows.map((row, i) => {
      const errors = [];
      const state  = stateMap[row.stateCode?.toUpperCase()];
      const dept   = deptMap[row.departmentSlug?.toLowerCase()];
      if (!row.name?.trim())                          errors.push("Name required");
      if (!row.staffId?.trim())                       errors.push("Staff ID required");
      if (!row.email?.includes("@nglosa.com"))        errors.push("Must be @nglosa.com email");
      if (!state)                                     errors.push(`Unknown state code: ${row.stateCode}`);
      if (row.departmentSlug && !dept)                errors.push(`Unknown department: ${row.departmentSlug}`);
      if (!["STAFF","DEPT_ADMIN","STATE_ADMIN"].includes(row.role?.toUpperCase?.()))
        row.role = "STAFF";
      return { rowNum: i + 2, ...row, stateName: state?.name, deptName: dept?.name, errors, valid: errors.length === 0 };
    });

    res.json({
      total:   preview.length,
      valid:   preview.filter(r => r.valid).length,
      invalid: preview.filter(r => !r.valid).length,
      rows:    preview.slice(0, 100), // cap preview at 100
    });
  } catch (err) { next(err); }
});

// POST /api/hrmis/import — actually import the CSV
router.post("/import", authenticate, isAdmin, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "CSV file required" });

    const rows = await parseCSV(req.file.buffer.toString("utf-8"));
    const [states, departments] = await Promise.all([
      prisma.state.findMany({ select: { id: true, code: true } }),
      prisma.department.findMany({ select: { id: true, slug: true } }),
    ]);
    const stateMap = {}; states.forEach(s => { stateMap[s.code.toUpperCase()] = s.id; });
    const deptMap  = {}; departments.forEach(d => { deptMap[d.slug.toLowerCase()] = d.id; });

    // Create import record
    const importRecord = await prisma.staffImport.create({
      data: {
        filename: req.file.originalname,
        totalRows: rows.length,
        status: "PROCESSING",
        uploadedById: req.user.id,
      },
    });

    // Process rows
    let imported = 0, skipped = 0;
    const errors = [];
    const defaultPassword = await bcrypt.hash("NiPOST@2026!", 12);

    for (const [i, row] of rows.entries()) {
      try {
        const stateId = stateMap[row.stateCode?.toUpperCase()];
        const deptId  = deptMap[row.departmentSlug?.toLowerCase()];
        if (!row.name || !row.staffId || !row.email?.includes("@nglosa.com") || !stateId) {
          errors.push({ row: i + 2, reason: "Validation failed — skipped" });
          skipped++;
          continue;
        }

        const existing = await prisma.user.findFirst({
          where: { OR: [{ email: row.email }, { staffId: row.staffId }] },
        });
        if (existing) { errors.push({ row: i + 2, reason: `Duplicate: ${row.email}` }); skipped++; continue; }

        const user = await prisma.$transaction(async (tx) => {
          const u = await tx.user.create({
            data: {
              name: row.name.trim(), staffId: row.staffId.trim(),
              email: row.email.trim().toLowerCase(),
              passwordHash: defaultPassword,
              phone: row.phone || null,
              postOffice: row.postOffice || null,
              stateId, departmentId: deptId || null,
              role: ["STAFF","DEPT_ADMIN","STATE_ADMIN"].includes(row.role?.toUpperCase()) ? row.role.toUpperCase() : "STAFF",
              status: "ACTIVE",
            },
          });
          // Auto-join announcements channel
          const annCh = await tx.channel.findFirst({ where: { type: "ANNOUNCEMENT" } });
          if (annCh) await tx.channelMember.create({ data: { userId: u.id, channelId: annCh.id } });
          // Auto-join state channel
          const stCh = await tx.channel.findFirst({ where: { type: "STATE", stateId } });
          if (stCh) await tx.channelMember.create({ data: { userId: u.id, channelId: stCh.id } });
          // Auto-join dept channel
          if (deptId) {
            const dtCh = await tx.channel.findFirst({ where: { type: "DEPARTMENT", departmentId: deptId } });
            if (dtCh) await tx.channelMember.create({ data: { userId: u.id, channelId: dtCh.id } });
          }
          return u;
        });
        imported++;
      } catch (err) {
        errors.push({ row: i + 2, reason: err.message });
        skipped++;
      }
    }

    await prisma.staffImport.update({
      where: { id: importRecord.id },
      data: { imported, skipped, errors: errors.length ? errors : null, status: "DONE", completedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "STAFF_IMPORT_COMPLETED",
        meta: { filename: req.file.originalname, imported, skipped, errors: errors.length } },
    });

    res.json({
      message: `Import complete. ${imported} imported, ${skipped} skipped.`,
      imported, skipped, errors: errors.slice(0, 20),
      importId: importRecord.id,
      defaultPassword: "NiPOST@2026!",
    });
  } catch (err) { next(err); }
});

async function parseCSV(csvString) {
  return new Promise((resolve, reject) => {
    parse(csvString, { columns: true, skip_empty_lines: true, trim: true },
      (err, records) => err ? reject(err) : resolve(records));
  });
}

module.exports = router;
