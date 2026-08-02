// server/src/routes/ai.js — Phase 4: AI Memo Drafting via Claude API
const express = require("express");
const { body, validationResult } = require("express-validator");
const axios = require("axios");
const { authenticate } = require("../middleware/auth");
const { isAdmin } = require("../middleware/rbac");

const router = express.Router();

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-6";

// POST /api/ai/draft-memo — generate a memo draft
router.post("/draft-memo", authenticate, isAdmin, [
  body("subject").trim().isLength({ min: 3, max: 300 }),
  body("keyPoints").isArray({ min: 1 }),
  body("tone").optional().isIn(["formal","professional","urgent","informational"]),
  body("audience").optional().trim().isLength({ max: 200 }),
  body("memoRef").optional().trim(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { subject, keyPoints, tone = "formal", audience = "All NiPOST Staff", memoRef } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: "AI service not configured. Set ANTHROPIC_API_KEY in server/.env" });
    }

    const systemPrompt = `You are an expert official memo writer for the Nigerian Postal Service (NiPOST). 
You write clear, professional, government-standard internal memos. 
Always use formal Nigerian government memo format.
Be concise, authoritative, and action-oriented.
Do not include any preamble — return only the memo body text, starting from the first paragraph.`;

    const userPrompt = `Write an official internal memo for NiPOST with the following details:

Subject: ${subject}
Reference: ${memoRef || "To be assigned"}
To: ${audience}
Tone: ${tone}
Key Points to Cover:
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Write the full memo body. Use clear headings where appropriate. End with a clear call to action or conclusion.`;

    const response = await axios.post(CLAUDE_API, {
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: userPrompt }],
    }, {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
    });

    const draft = response.data.content?.[0]?.text || "";
    if (!draft) return res.status(500).json({ error: "AI returned an empty response" });

    res.json({ draft, subject, audience, tone, model: CLAUDE_MODEL });
  } catch (err) {
    if (err.response?.status === 401) return res.status(503).json({ error: "Invalid Anthropic API key" });
    if (err.response?.status === 429) return res.status(429).json({ error: "AI rate limit reached. Try again in a moment." });
    next(err);
  }
});

// POST /api/ai/refine-memo — refine an existing draft
router.post("/refine-memo", authenticate, isAdmin, [
  body("draft").trim().isLength({ min: 10 }),
  body("instruction").trim().isLength({ min: 5, max: 500 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { draft, instruction } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: "AI service not configured" });
    }

    const response = await axios.post(CLAUDE_API, {
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are refining an official NiPOST internal memo. Here is the current draft:

${draft}

Instruction: ${instruction}

Return only the revised memo body. No preamble.`,
        },
      ],
    }, {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
    });

    const refined = response.data.content?.[0]?.text || "";
    res.json({ draft: refined });
  } catch (err) { next(err); }
});

module.exports = router;
