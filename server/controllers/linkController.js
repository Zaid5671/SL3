import fetch from "node-fetch";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";
import Link from "../models/Link.js";
import Project from "../models/Project.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import { initializeContextFeedForNewLink } from "../services/contextFeedService.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const FADE_START_DAYS = 14;
const FADE_END_DAYS = 30;
const GRAVEYARD_MOVE_DAYS = 31;
const VIBE_CATEGORIES = [
  "High-Signal",
  "Educational",
  "Chaotic",
  "Cursed",
  "Wholesome",
  "Insightful",
  "Controversial",
  "Funny",
];
const DEFAULT_VIBE = "Educational";
const TAG_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "about",
  "into",
  "over",
  "under",
  "how",
  "why",
  "what",
  "when",
  "where",
  "which",
  "are",
  "was",
  "were",
  "will",
  "can",
  "could",
  "should",
  "would",
  "you",
  "they",
  "them",
  "their",
  "our",
  "out",
  "new",
  "best",
  "guide",
  "tips",
  "top",
  "vs",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "is",
  "it",
  "as",
]);

const normalizeProfileTag = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  return normalized.slice(0, 80);
};

const toTitleCase = (text) =>
  text
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const buildFallbackTagFromHeadings = (headings) => {
  const freq = new Map();

  headings.forEach((heading) => {
    String(heading)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !TAG_STOP_WORDS.has(token))
      .forEach((token) => {
        freq.set(token, (freq.get(token) || 0) + 1);
      });
  });

  const topTokens = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([token]) => token);

  if (topTokens.length) {
    return normalizeProfileTag(toTitleCase(topTokens.join(" ")));
  }

  const firstHeading = String(headings[0] || "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");

  return normalizeProfileTag(toTitleCase(firstHeading || "General Reader"));
};

const updateUserProfileTag = async (userId) => {
  try {
    const links = await Link.find({ user: userId })
      .select("title")
      .sort({ updatedAt: -1 })
      .limit(40)
      .lean();

    const headings = [
      ...new Set(
        links
          .map((item) => (item?.title ? String(item.title).trim() : ""))
          .filter(Boolean),
      ),
    ].slice(0, 25);

    if (!headings.length) {
      await User.findByIdAndUpdate(userId, {
        profileTag: null,
        profileTagUpdatedAt: null,
      });
      return null;
    }

    const fallbackTag = buildFallbackTagFromHeadings(headings);

    const prompt = `
      Based on these URL headings posted by a user, generate one short profile tag.
      Rules:
      - 1 to 4 words only
      - Should represent the user's recurring interests/topics
      - No hashtags, no punctuation-heavy output
      - Return JSON only: {"tag":"..."}

      Headings:
      ${headings.map((heading, idx) => `${idx + 1}. ${heading}`).join("\n")}
    `;

    let normalizedTag = null;
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 40,
        top_p: 1,
        response_format: { type: "json_object" },
      });

      const result = chatCompletion.choices[0]?.message?.content;
      if (!result) {
        throw new Error("Groq tag API returned no result.");
      }

      const parsed = JSON.parse(result);
      normalizedTag = normalizeProfileTag(parsed.tag || parsed.profileTag);
      if (!normalizedTag) {
        throw new Error("Groq tag API returned an empty tag.");
      }
    } catch (error) {
      console.error("Profile tag generation error (fallback used):", error);
      normalizedTag = fallbackTag;
    }

    await User.findByIdAndUpdate(userId, {
      profileTag: normalizedTag,
      profileTagUpdatedAt: normalizedTag ? new Date() : null,
    });

    return normalizedTag;
  } catch (error) {
    console.error("Profile tag generation error:", error);
    return null;
  }
};

const normalizeVibe = (value) => {
  if (!value) return DEFAULT_VIBE;
  const normalized = String(value).trim().toLowerCase();
  const match = VIBE_CATEGORIES.find(
    (category) => category.toLowerCase() === normalized,
  );
  return match || DEFAULT_VIBE;
};

const canUserManageLink = async (userId, link) => {
  if (!link) return false;

  if (String(link.user) === String(userId)) {
    return true;
  }

  if (!link.roomId) {
    return false;
  }

  const room = await Room.findOne({ roomId: link.roomId, members: userId })
    .select("_id")
    .lean();

  return !!room;
};

async function getGroqChatCompletion(content) {
  const prompt = `
    Analyze the following web content and return a JSON object with the following structure:
    {
      "title": "A concise, catchy title for the content",
      "summary": "A 2-3 sentence summary of the key points. Should be engaging and informative.",
      "vibe": "Choose ONE of the following vibes only: ${VIBE_CATEGORIES.join(", ")}",
      "icon": "Provide a single emoji that represents the content's theme."
    }

    Here is the content:
    ---
    ${content.slice(0, 7000)}
    ---
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 250,
      top_p: 1,
      response_format: { type: "json_object" },
    });

    const result = chatCompletion.choices[0]?.message?.content;
    if (!result) throw new Error("Groq API returned no result.");
    return JSON.parse(result);
  } catch (error) {
    console.error("Groq API Error:", error);
    return {
      title: "Content Analysis Failed",
      summary: "The AI summarizer could not process this content.",
      vibe: DEFAULT_VIBE,
      icon: "💀",
    };
  }
}

async function getCategoryFromSummary(summary) {
  const prompt = `
    Based on the following summary, choose exactly one category from this list:
    ${JSON.stringify(VIBE_CATEGORIES)}

    Return a JSON object with a single key "category".
    Example: {"category": "Educational"}

    Summary:
    ---
    ${summary}
    ---
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 50,
      top_p: 1,
      response_format: { type: "json_object" },
    });

    const result = chatCompletion.choices[0]?.message?.content;
    if (!result) throw new Error("Groq API returned no category result.");

    const parsedResult = JSON.parse(result);
    return normalizeVibe(parsedResult.category || parsedResult.vibe);
  } catch (error) {
    console.error("Groq Category API Error:", error);
    return DEFAULT_VIBE;
  }
}

// @desc    Scrape and save a new link
// @route   POST /api/links/ingest
// @access  Private
export const ingestLink = async (req, res) => {
  const { url, roomId, scope, projectId } = req.body;
  const userId = req.user.id;
  const requestedRoomId = roomId ? roomId.toUpperCase().trim() : null;
  const isPersonalScope = scope === "personal";
  const isPersonalShelf =
    isPersonalScope || requestedRoomId?.startsWith("PERSONAL_");
  const storageRoomId = isPersonalShelf ? null : requestedRoomId;

  if (!url) {
    return res.status(400).json({ message: "URL is required" });
  }

  if (storageRoomId) {
    const room = await Room.findOne({ roomId: storageRoomId, members: userId })
      .select("_id")
      .lean();

    if (!room) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room" });
    }
  }

  let targetProject = null;
  if (projectId) {
    targetProject = await Project.findById(projectId).lean();
    if (!targetProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    const projectRoomId = targetProject.roomId || null;
    const sameScope = projectRoomId === storageRoomId;
    if (!sameScope) {
      return res.status(400).json({
        message: "Selected project does not belong to this shelf scope",
      });
    }

    if (!projectRoomId && String(targetProject.user) !== String(userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to use this project" });
    }

    if (projectRoomId) {
      const room = await Room.findOne({
        roomId: projectRoomId,
        members: userId,
      })
        .select("_id")
        .lean();
      if (!room) {
        return res
          .status(403)
          .json({ message: "You are not a member of this room" });
      }
    }
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const html = await response.text();

    const $ = cheerio.load(html);
    const scrapedTitle =
      $("title").first().text() || $("h1").first().text() || "No title found";

    $("script, style, nav, footer, header, aside").remove();
    const content = $("body").text().replace(/\s\s+/g, " ").trim();

    if (!content) {
      return res
        .status(400)
        .json({ message: "Could not extract content from the URL." });
    }

    const aiAnalysis = await getGroqChatCompletion(content);
    const aiVibe = normalizeVibe(aiAnalysis.vibe);
    const category = await getCategoryFromSummary(
      aiAnalysis.summary || content.slice(0, 500),
    );

    const newLink = new Link({
      user: userId,
      roomId: storageRoomId,
      project: targetProject?._id || null,
      originalUrl: url,
      title: aiAnalysis.title || scrapedTitle,
      summary: aiAnalysis.summary || "No summary available.",
      vibe: category || aiVibe || DEFAULT_VIBE,
      icon: aiAnalysis.icon || "📘",
      source: new URL(url).hostname.replace(/^www\./, ""),
      content,
      decay: 0,
      ...initializeContextFeedForNewLink(),
    });

    await newLink.save();
    await updateUserProfileTag(userId);

    const io = req.app.locals.io;
    if (io) {
      if (requestedRoomId) {
        io.to(requestedRoomId).emit("message", {
          type: "LINK_ADDED",
          card: newLink,
          addedBy: req.user.username || "Someone",
        });
      } else {
        io.emit("message", {
          type: "LINK_ADDED",
          card: newLink,
          addedBy: req.user.username || "Someone",
        });
      }
    }

    res.status(201).json(newLink);
  } catch (error) {
    console.error("Ingestion error:", error);
    res.status(500).json({
      message:
        "Failed to ingest link. The URL may be invalid or the site may block scraping.",
    });
  }
};

// @desc    Get all links — filtered by roomId if provided
// @route   GET /api/links?roomId=XXXX
// @access  Private
export const getLinks = async (req, res) => {
  try {
    const { roomId, archived, scope, projectId } = req.query;
    const isArchived = archived === "true";
    const isPersonalScope = scope === "personal";

    const normalizedRoomId = roomId ? roomId.toUpperCase().trim() : null;

    const dayMs = 1000 * 60 * 60 * 24;
    const cutoffDate = new Date(Date.now() - GRAVEYARD_MOVE_DAYS * dayMs);

    // Auto-shift cards to graveyard on day 31.
    await Link.updateMany(
      {
        $and: [
          {
            $or: [
              { updatedAt: { $lte: cutoffDate } },
              {
                updatedAt: { $exists: false },
                createdAt: { $lte: cutoffDate },
              },
            ],
          },
          {
            $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
          },
        ],
      },
      { $set: { isArchived: true, decay: 100 } },
    );

    let query;
    if (isPersonalScope) {
      // Personal space: always resolve by the authenticated user ID.
      query = { user: req.user.id };
    } else if (!normalizedRoomId) {
      // Fallback without an explicit room still returns this user's cards.
      query = { user: req.user.id };
    } else if (normalizedRoomId.startsWith("PERSONAL_")) {
      query = { user: req.user.id };
    } else {
      const room = await Room.findOne({
        roomId: normalizedRoomId,
        members: req.user.id,
      })
        .select("_id")
        .lean();

      if (!room) {
        return res
          .status(403)
          .json({ message: "You are not a member of this room" });
      }

      query = { roomId: normalizedRoomId };
    }

    if (isArchived) {
      query.isArchived = true;
    } else {
      query.$or = [{ isArchived: false }, { isArchived: { $exists: false } }];
    }

    if (projectId) {
      query.project = projectId;
    }

    const links = await Link.find(query).sort({ createdAt: -1 });

    const linksWithAgeDecay = links.map((link) => {
      const baseTime = new Date(link.updatedAt || link.createdAt).getTime();
      const ageDays = Number.isNaN(baseTime)
        ? 0
        : Math.max(0, Math.floor((Date.now() - baseTime) / dayMs));
      let ageDecay = 0;
      if (ageDays >= FADE_END_DAYS) {
        ageDecay = 100;
      } else if (ageDays > FADE_START_DAYS) {
        ageDecay = Math.round(
          ((ageDays - FADE_START_DAYS) / (FADE_END_DAYS - FADE_START_DAYS)) *
            100,
        );
      }

      return {
        ...link.toObject(),
        decay: Math.max(link.decay || 0, ageDecay),
      };
    });

    res.json(linksWithAgeDecay);
  } catch (error) {
    console.error("Error fetching links:", error);
    res.status(500).send("Server Error");
  }
};

// @desc    Delete a link
// @route   DELETE /api/links/:id
// @access  Private
export const deleteLink = async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);

    if (!link) {
      return res.status(404).json({ message: "Link not found" });
    }

    const canManage = await canUserManageLink(req.user.id, link);
    if (!canManage) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this link" });
    }

    const deletedLink = await Link.findByIdAndDelete(req.params.id);

    if (!deletedLink) {
      return res.status(404).json({ message: "Link not found" });
    }

    res.json({ message: "Link deleted successfully", id: deletedLink._id });
  } catch (error) {
    console.error("Error deleting link:", error);
    res.status(500).json({ message: "Server error while deleting link" });
  }
};

// @desc    Archive a link
// @route   PUT /api/links/:id/archive
// @access  Private
export const archiveLink = async (req, res) => {
  try {
    const existingLink = await Link.findById(req.params.id);

    if (!existingLink) {
      return res.status(404).json({ message: "Link not found" });
    }

    const canManage = await canUserManageLink(req.user.id, existingLink);
    if (!canManage) {
      return res
        .status(403)
        .json({ message: "Not authorized to archive this link" });
    }

    const link = await Link.findByIdAndUpdate(
      req.params.id,
      { isArchived: true, decay: 100 },
      { new: true },
    );

    res.json(link);
  } catch (error) {
    console.error("Error archiving link:", error);
    res.status(500).send("Server Error");
  }
};

// @desc    Restore a link
// @route   PUT /api/links/:id/restore
// @access  Private
export const restoreLink = async (req, res) => {
  try {
    const existingLink = await Link.findById(req.params.id);

    if (!existingLink) {
      return res.status(404).json({ message: "Link not found" });
    }

    const canManage = await canUserManageLink(req.user.id, existingLink);
    if (!canManage) {
      return res
        .status(403)
        .json({ message: "Not authorized to restore this link" });
    }

    const link = await Link.findByIdAndUpdate(
      req.params.id,
      { isArchived: false, decay: 0, updatedAt: new Date() },
      { new: true },
    );

    res.json(link);
  } catch (error) {
    console.error("Error restoring link:", error);
    res.status(500).send("Server Error");
  }
};

// @desc    Move a link into/out of a project
// @route   PUT /api/links/:id/project
// @access  Private
export const moveLinkToProject = async (req, res) => {
  try {
    const { projectId } = req.body;
    const existingLink = await Link.findById(req.params.id);

    if (!existingLink) {
      return res.status(404).json({ message: "Link not found" });
    }

    const canManage = await canUserManageLink(req.user.id, existingLink);
    if (!canManage) {
      return res
        .status(403)
        .json({ message: "Not authorized to move this link" });
    }

    if (!projectId) {
      const updated = await Link.findByIdAndUpdate(
        req.params.id,
        { project: null },
        { new: true },
      );
      return res.json(updated);
    }

    const targetProject = await Project.findById(projectId);
    if (!targetProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    const linkScopeRoomId = existingLink.roomId || null;
    const projectScopeRoomId = targetProject.roomId || null;

    if (linkScopeRoomId !== projectScopeRoomId) {
      return res
        .status(400)
        .json({ message: "Project does not belong to the same shelf scope" });
    }

    if (
      !projectScopeRoomId &&
      String(targetProject.user) !== String(req.user.id)
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to use this project" });
    }

    if (projectScopeRoomId) {
      const room = await Room.findOne({
        roomId: projectScopeRoomId,
        members: req.user.id,
      })
        .select("_id")
        .lean();

      if (!room) {
        return res
          .status(403)
          .json({ message: "You are not a member of this room" });
      }
    }

    const updated = await Link.findByIdAndUpdate(
      req.params.id,
      { project: targetProject._id },
      { new: true },
    );

    return res.json(updated);
  } catch (error) {
    console.error("Error moving link to project:", error);
    return res.status(500).json({ message: "Server error moving link" });
  }
};
