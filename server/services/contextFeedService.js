import Groq from "groq-sdk";
import Link from "../models/Link.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const CONTEXT_FEED_INTERVAL_DAYS = 5;
const CONTEXT_FEED_INTERVAL_MS =
  CONTEXT_FEED_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

const STATUS_ALLOWLIST = new Set([
  "up-to-date",
  "updated",
  "successor-found",
  "stale",
  "unclear",
  "pending",
]);

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const scheduleNextCheckFrom = (baseDate) => {
  const base = toDate(baseDate) || new Date();
  return new Date(base.getTime() + CONTEXT_FEED_INTERVAL_MS);
};

const normalizeStatus = (value) => {
  const status = String(value || "")
    .trim()
    .toLowerCase();
  return STATUS_ALLOWLIST.has(status) ? status : "unclear";
};

const normalizeSources = (value) => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.map((item) => String(item || "").trim()).filter(Boolean)),
  ].slice(0, 6);
};

const parseGroqResponse = (rawContent) => {
  const fallback = {
    status: "unclear",
    summary: "No grounded update could be extracted.",
    successorUrl: "",
    confidence: null,
    sources: [],
    provider: "groq",
    error: "",
  };

  if (!rawContent) {
    return { ...fallback, error: "Empty response from Groq" };
  }

  try {
    const parsed = JSON.parse(rawContent);
    const confidenceNum = Number(parsed.confidence);

    return {
      status: normalizeStatus(parsed.status),
      summary: String(parsed.update || parsed.summary || "")
        .trim()
        .slice(0, 800),
      successorUrl: String(parsed.successorUrl || "")
        .trim()
        .slice(0, 300),
      confidence: Number.isFinite(confidenceNum)
        ? Math.max(0, Math.min(1, confidenceNum))
        : null,
      sources: normalizeSources(parsed.sources),
      provider: "groq",
      error: "",
    };
  } catch {
    return {
      ...fallback,
      summary: String(rawContent).trim().slice(0, 800),
      error: "Groq response was not valid JSON",
    };
  }
};

const buildPrompt = (link) => {
  const createdAtIso = link.createdAt
    ? new Date(link.createdAt).toISOString()
    : "Unknown";

  return `
You are a relevance analyst. Compare this saved link topic against what is likely current now.
If confidence is low, use status "unclear".

Return STRICT JSON with this shape:
{
  "status": "up-to-date|updated|successor-found|stale|unclear",
  "update": "2-4 concise sentences about what changed (or did not change)",
  "successorUrl": "best newer canonical URL if applicable, else empty string",
  "confidence": 0.0,
  "sources": ["url1","url2"]
}

Link saved data:
- Original URL: ${link.originalUrl}
- Saved title: ${link.title}
- Saved summary: ${link.summary}
- Saved date (UTC): ${createdAtIso}

Ground this with fresh web search context and compare against saved date.
If nothing significant changed, use status "up-to-date".
If there is a clearly better/newer source, use status "successor-found" and provide successorUrl.
`;
};

export const refreshContextFeedForLink = async (link) => {
  const now = new Date();

  if (!process.env.GROQ_API_KEY) {
    const nextCheckAt = scheduleNextCheckFrom(now);
    await Link.findByIdAndUpdate(
      link._id,
      {
        contextFeed: {
          status: "unclear",
          summary: "Context feed is waiting for GROQ_API_KEY.",
          successorUrl: "",
          confidence: null,
          sources: [],
          checkedAt: now,
          provider: "groq",
          error: "Missing GROQ_API_KEY",
        },
        contextFeedLastCheckedAt: now,
        contextFeedNextCheckAt: nextCheckAt,
      },
      { timestamps: false },
    );
    return;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You provide concise update assessments and always return strict JSON only.",
        },
        {
          role: "user",
          content: buildPrompt(link),
        },
      ],
      temperature: 0.2,
      max_tokens: 260,
      top_p: 1,
      response_format: { type: "json_object" },
    });

    const rawContent = completion?.choices?.[0]?.message?.content;
    const normalized = parseGroqResponse(rawContent);
    const nextCheckAt = scheduleNextCheckFrom(now);

    await Link.findByIdAndUpdate(
      link._id,
      {
        contextFeed: {
          ...normalized,
          checkedAt: now,
        },
        contextFeedLastCheckedAt: now,
        contextFeedNextCheckAt: nextCheckAt,
      },
      { timestamps: false },
    );
  } catch (error) {
    const nextCheckAt = scheduleNextCheckFrom(now);
    await Link.findByIdAndUpdate(
      link._id,
      {
        contextFeed: {
          status: "unclear",
          summary: "Context feed refresh failed. Will retry automatically.",
          successorUrl: "",
          confidence: null,
          sources: [],
          checkedAt: now,
          provider: "groq",
          error: String(error?.message || error),
        },
        contextFeedLastCheckedAt: now,
        contextFeedNextCheckAt: nextCheckAt,
      },
      { timestamps: false },
    );
  }
};

export const runContextFeedSweep = async ({ limit = 8 } = {}) => {
  const now = new Date();
  const pendingCutoff = new Date(now.getTime() - CONTEXT_FEED_INTERVAL_MS);

  const dueLinks = await Link.find({
    $and: [
      {
        $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
      },
      {
        $or: [
          { contextFeedNextCheckAt: { $lte: now } },
          { contextFeedNextCheckAt: { $exists: false } },
          { contextFeedNextCheckAt: null },
          {
            $and: [
              { createdAt: { $lte: pendingCutoff } },
              { "contextFeed.status": "pending" },
              {
                $or: [
                  { "contextFeed.checkedAt": null },
                  { "contextFeed.checkedAt": { $exists: false } },
                ],
              },
            ],
          },
        ],
      },
    ],
  })
    .sort({ contextFeedNextCheckAt: 1, createdAt: 1 })
    .limit(limit)
    .lean();

  for (const link of dueLinks) {
    // Run sequentially to avoid API burst/rate-limit issues.
    await refreshContextFeedForLink(link);
  }

  return { processed: dueLinks.length };
};

export const initializeContextFeedForNewLink = (createdAt = new Date()) => {
  const created = toDate(createdAt) || new Date();

  return {
    contextFeed: {
      status: "pending",
      summary:
        "Context feed scheduled. First grounded update will run automatically.",
      successorUrl: "",
      confidence: null,
      sources: [],
      checkedAt: null,
      provider: "groq",
      error: "",
    },
    contextFeedLastCheckedAt: null,
    contextFeedNextCheckAt: scheduleNextCheckFrom(created),
  };
};
