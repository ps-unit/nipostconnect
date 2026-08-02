// server/src/utils/sentry.js — Phase 6
// Optional Sentry error monitoring — only activates if SENTRY_DSN is set

let Sentry = null;

function initSentry(app) {
  if (!process.env.SENTRY_DSN) {
    console.log("   Sentry       : ⚠️  Not configured (set SENTRY_DSN to enable)");
    return;
  }
  try {
    Sentry = require("@sentry/node");
    const { nodeProfilingIntegration } = require("@sentry/profiling-node");

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      release: `nipost-connect@${process.env.npm_package_version || "5.0.0"}`,
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration({ app }),
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
      profilesSampleRate: 0.1,
    });

    console.log("   Sentry       : ✅ Enabled");
  } catch (err) {
    console.warn("   Sentry       : ⚠️  Failed to initialise:", err.message);
  }
}

function sentryRequestHandler() {
  if (!Sentry) return (req, res, next) => next();
  return Sentry.Handlers.requestHandler();
}

function sentryErrorHandler() {
  if (!Sentry) return (err, req, res, next) => next(err);
  return Sentry.Handlers.errorHandler();
}

function captureException(err, context) {
  if (Sentry) Sentry.captureException(err, { extra: context });
}

module.exports = { initSentry, sentryRequestHandler, sentryErrorHandler, captureException };
