// server/src/utils/sms.js — Phase 4: Termii SMS gateway
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TERMII_BASE    = process.env.TERMII_BASE_URL    || "https://api.ng.termii.com/api";
const TERMII_API_KEY = process.env.TERMII_API_KEY;
const SENDER_ID      = process.env.TERMII_SENDER_ID   || "NiPOST";

/**
 * Send a single SMS via Termii
 */
const sendSMS = async ({ to, message, sentById }) => {
  if (!TERMII_API_KEY) {
    console.warn("[SMS] TERMII_API_KEY not configured — SMS skipped");
    return null;
  }

  // Normalise Nigerian phone number to international format
  const phone = normalisePhone(to);
  if (!phone) { console.warn("[SMS] Invalid phone number:", to); return null; }

  try {
    const res = await axios.post(`${TERMII_BASE}/sms/send`, {
      to: phone,
      from: SENDER_ID,
      sms: message,
      type: "plain",
      channel: "generic",
      api_key: TERMII_API_KEY,
    });

    const termiiRef = res.data?.message_id || res.data?.uid || null;

    // Log to DB
    if (sentById) {
      await prisma.sMSLog.create({
        data: { recipient: phone, message, status: "SENT", termiiRef, sentById },
      });
    }

    console.log(`[SMS] Sent to ${phone} — ref: ${termiiRef}`);
    return { success: true, ref: termiiRef };
  } catch (err) {
    console.error("[SMS] Termii error:", err.response?.data || err.message);
    if (sentById) {
      await prisma.sMSLog.create({
        data: { recipient: phone, message, status: "FAILED", sentById },
      });
    }
    return { success: false, error: err.message };
  }
};

/**
 * Bulk SMS — send to many phone numbers (batched to avoid rate limits)
 */
const sendBulkSMS = async ({ phones, message, sentById, batchSize = 10 }) => {
  if (!TERMII_API_KEY) {
    console.warn("[SMS] TERMII_API_KEY not configured — bulk SMS skipped");
    return { sent: 0, failed: phones.length };
  }

  const valid    = phones.map(normalisePhone).filter(Boolean);
  const results  = { sent: 0, failed: phones.length - valid.length };

  // Process in batches
  for (let i = 0; i < valid.length; i += batchSize) {
    const batch = valid.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (phone) => {
        const r = await sendSMS({ to: phone, message, sentById });
        r?.success ? results.sent++ : results.failed++;
      })
    );
    // Small delay between batches to respect rate limits
    if (i + batchSize < valid.length) await delay(500);
  }

  console.log(`[SMS] Bulk sent: ${results.sent} OK, ${results.failed} failed`);
  return results;
};

/**
 * Emergency SMS — send to all staff with phone numbers not currently online
 */
const sendEmergencySMS = async ({ message, onlineUserIds = [], sentById }) => {
  const staffWithPhone = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      phone: { not: null },
      id: { notIn: onlineUserIds },
    },
    select: { phone: true },
  });

  const phones = staffWithPhone.map(u => u.phone).filter(Boolean);
  if (phones.length === 0) return { sent: 0, failed: 0, total: 0 };

  console.log(`[SMS] Emergency: sending to ${phones.length} offline staff`);
  const result = await sendBulkSMS({ phones, message, sentById });
  return { ...result, total: phones.length };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalisePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  if (digits.length === 10) return "234" + digits;
  return null;
}

const delay = ms => new Promise(r => setTimeout(r, ms));

module.exports = { sendSMS, sendBulkSMS, sendEmergencySMS };
