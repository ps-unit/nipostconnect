// server/src/routes/sms.js — Phase 4
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { isAdmin, isSuperAdmin } = require("../middleware/rbac");
const { sendSMS, sendEmergencySMS } = require("../utils/sms");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/sms/logs — SMS dispatch history
router.get("/logs", authenticate, isAdmin, async (req, res, next) => {
  try {
    const logs = await prisma.sMSLog.findMany({
      include: { sentBy: { select: { name: true, staffId: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ logs });
  } catch (err) { next(err); }
});

// POST /api/sms/send — send SMS to a specific phone number
router.post("/send", authenticate, isAdmin, [
  body("phone").trim().notEmpty(),
  body("message").trim().isLength({ min: 5, max: 160 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const result = await sendSMS({
      to: req.body.phone,
      message: req.body.message,
      sentById: req.user.id,
    });

    res.json({ result, message: result?.success ? "SMS sent" : "SMS failed" });
  } catch (err) { next(err); }
});

// POST /api/sms/emergency — SMS all offline staff (Super Admin only)
router.post("/emergency", authenticate, isSuperAdmin, [
  body("message").trim().isLength({ min: 10, max: 160 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const io = req.app.get("io");
    const onlineIds = io?.getOnlineUsers?.() || [];

    const result = await sendEmergencySMS({
      message: req.body.message,
      onlineUserIds: onlineIds,
      sentById: req.user.id,
    });

    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "EMERGENCY_SMS_SENT",
        meta: { ...result, message: req.body.message } },
    });

    res.json({ message: `Emergency SMS dispatched`, ...result });
  } catch (err) { next(err); }
});

module.exports = router;
