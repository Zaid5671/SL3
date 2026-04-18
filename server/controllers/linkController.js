import fetch from "node-fetch";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";
import Link from "../models/Link.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getGroqChatCompletion(content) {
  const prompt = `
    Analyze the following web content and return a JSON object with the following structure:
    {
      "title": "A concise, catchy title for the content",
      "summary": "A 2-3 sentence summary of the key points. Should be engaging and informative.",
      "vibe": "Choose ONE of the following vibes that best fits the content: High-Signal, Educational, Chaotic, Cursed",
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
      vibe: "Cursed",
      icon: "💀",
    };
  }
}

async function getCategoryFromSummary(summary) {
  const prompt = `
    Based on the following summary, what is the best single-word category for this content?
    Return a JSON object with a single key "category". For example: {"category": "Technology"}.

    Do not use generic terms like "Informative" or "Article". Be specific, like "Programming", "Health", "Science", "History", "Business", "Art", etc.

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
    return parsedResult.category || "General";
  } catch (error) {
    console.error("Groq Category API Error:", error);
    return "General";
  }
}

// @desc    Scrape and save a new link
// @route   POST /api/links/ingest
// @access  Private
export const ingestLink = async (req, res) => {
  const { url, roomId } = req.body;
  const userId = req.user.id;
  const requestedRoomId = roomId ? roomId.toUpperCase().trim() : null;
  const isPersonalShelf = requestedRoomId?.startsWith("PERSONAL_");
  const storageRoomId = isPersonalShelf ? null : requestedRoomId;

  if (!url) {
    return res.status(400).json({ message: "URL is required" });
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
    const category = await getCategoryFromSummary(
      aiAnalysis.summary || content.slice(0, 500),
    );

    const newLink = new Link({
      user: userId,
      roomId: storageRoomId,
      originalUrl: url,
      title: aiAnalysis.title || scrapedTitle,
      summary: aiAnalysis.summary || "No summary available.",
      vibe: category || aiAnalysis.vibe || "Educational",
      icon: aiAnalysis.icon || "📘",
      source: new URL(url).hostname.replace(/^www\./, ""),
      content,
      decay: 0,
    });

    await newLink.save();

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
    const { roomId, archived } = req.query;
    const isArchived = archived === 'true';

    const normalizedRoomId = roomId ? roomId.toUpperCase().trim() : null;

    let query;
    if (!normalizedRoomId) {
      query = { user: req.user.id, roomId: null };
    } else if (normalizedRoomId.startsWith("PERSONAL_")) {
      query = {
        user: req.user.id,
        roomId: { $in: [null, normalizedRoomId] },
      };
    } else {
      query = { roomId: normalizedRoomId };
    }

    query.isArchived = isArchived;

    const links = await Link.find(query).sort({ createdAt: -1 });
    res.json(links);
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
    const deletedLink = await Link.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

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
    const link = await Link.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isArchived: true, decay: 100 },
      { new: true }
    );
    if (!link) return res.status(404).json({ message: "Link not found" });
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
    const link = await Link.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isArchived: false, decay: 0 },
      { new: true }
    );
    if (!link) return res.status(404).json({ message: "Link not found" });
    res.json(link);
  } catch (error) {
    console.error("Error restoring link:", error);
    res.status(500).send("Server Error");
  }
};
