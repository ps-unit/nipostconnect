// server/src/utils/email.js — Phase 6
// Nodemailer-based email service (works with Brevo, Sendgrid, Gmail SMTP, etc.)
const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_NAME = process.env.EMAIL_FROM_NAME || "NiPOST Connect";
const FROM_ADDR = process.env.EMAIL_FROM_ADDR || "noreply@nglosa.com";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

let transporter = null;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   SMTP_HOST,
      port:   SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth:   { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

// ── Base HTML wrapper ─────────────────────────────────────────────────────────
function baseHtml(title, body) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:'Helvetica Neue',Arial,sans-serif;background:#081832;color:#E8EDF5;margin:0;padding:0}
.container{max-width:520px;margin:40px auto;background:#0D2244;border-radius:12px;border:1px solid #1E3A5F;overflow:hidden}
.header{background:#050F20;padding:24px;text-align:center;border-bottom:1px solid #1E3A5F}
.logo{font-size:36px;display:block;margin-bottom:8px}
.brand{color:#D4A843;font-size:20px;font-weight:700}
.body{padding:28px 32px}
.btn{display:inline-block;padding:12px 28px;background:#D4A843;color:#0A1F44;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:20px 0}
.code{font-family:monospace;font-size:24px;font-weight:700;color:#D4A843;background:#081832;padding:14px 24px;border-radius:8px;letter-spacing:0.15em;display:inline-block;margin:16px 0}
.footer{padding:18px 32px;border-top:1px solid #1E3A5F;font-size:12px;color:#4B6280;text-align:center}
p{color:#B0BDD0;line-height:1.7;margin:0 0 14px}
</style></head>
<body><div class="container">
<div class="header"><span class="logo">📮</span><span class="brand">NiPOST Connect</span></div>
<div class="body">${body}</div>
<div class="footer">Nigerian Postal Service — Internal Platform<br>This is an automated message. Do not reply.</div>
</div></body></html>`;
}

// ── Send wrapper ──────────────────────────────────────────────────────────────
async function send({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email] SMTP not configured — would send to ${to}: ${subject}`);
    return { skipped: true };
  }
  try {
    const info = await t.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDR}>`,
      to, subject, html, text,
    });
    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email] Failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ── Welcome email ─────────────────────────────────────────────────────────────
async function sendWelcome({ name, email, staffId, tempPassword }) {
  const subject = "Welcome to NiPOST Connect";
  const html = baseHtml("Welcome", `
    <p>Dear ${name},</p>
    <p>Your NiPOST Connect account has been created. You can now access the internal communication platform.</p>
    <p><strong>Your login details:</strong></p>
    <p>📧 Email: <strong>${email}</strong><br>🪪 Staff ID: <strong>${staffId}</strong></p>
    ${tempPassword ? `<p>Temporary password:<br><span class="code">${tempPassword}</span><br>Please change this immediately after your first login.</p>` : ""}
    <a href="${CLIENT_URL}/login" class="btn">Sign In to NiPOST Connect</a>
    <p style="font-size:12px;color:#4B6280;margin-top:16px">
      If you did not expect this email, please contact ICT at ict@nglosa.com
    </p>
  `);
  return send({ to: email, subject, html, text: `Welcome ${name}. Login at ${CLIENT_URL}/login` });
}

// ── Password reset email ──────────────────────────────────────────────────────
async function sendPasswordReset({ name, email, resetToken }) {
  const resetUrl = `${CLIENT_URL}/reset-password?token=${resetToken}`;
  const subject = "Password Reset — NiPOST Connect";
  const html = baseHtml("Password Reset", `
    <p>Dear ${name},</p>
    <p>We received a request to reset your NiPOST Connect password. Click the button below to create a new password.</p>
    <a href="${resetUrl}" class="btn">Reset My Password</a>
    <p>Or copy this link into your browser:<br>
    <span style="font-size:12px;color:#6B8299;word-break:break-all">${resetUrl}</span></p>
    <p style="font-size:12px;color:#4B6280">
      This link expires in <strong>30 minutes</strong>.<br>
      If you did not request a password reset, ignore this email. Your password has not changed.
    </p>
  `);
  return send({ to: email, subject, html,
    text: `Reset your NiPOST Connect password: ${resetUrl} (expires in 30 minutes)` });
}

// ── Account suspended notification ───────────────────────────────────────────
async function sendSuspensionNotice({ name, email, reason }) {
  const subject = "Account Notice — NiPOST Connect";
  const html = baseHtml("Account Notice", `
    <p>Dear ${name},</p>
    <p>Your NiPOST Connect account has been temporarily suspended.</p>
    ${reason ? `<p>Reason: ${reason}</p>` : ""}
    <p>Please contact the ICT helpdesk or your HR department for further information.</p>
    <p>📧 ict@nglosa.com | ☎ +234 9 234 8000 ext. 1200</p>
  `);
  return send({ to: email, subject, html });
}

module.exports = { sendWelcome, sendPasswordReset, sendSuspensionNotice, send };
