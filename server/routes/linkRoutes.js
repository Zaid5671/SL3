import express from "express";
import {
  ingestLink,
  getLinks,
  deleteLink,
  archiveLink,
  restoreLink
} from "../controllers/linkController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.put("/:id/archive", authMiddleware, archiveLink);
router.put("/:id/restore", authMiddleware, restoreLink);

// @route   POST /api/links/ingest
// @desc    Scrape and save a new link
// @access  Private
router.post("/ingest", authMiddleware, ingestLink);

// @route   GET /api/links
// @desc    Get all links for a user
// @access  Private
router.get("/", authMiddleware, getLinks);

// @route   DELETE /api/links/:id
// @desc    Delete a link for a user
// @access  Private
router.delete("/:id", authMiddleware, deleteLink);

export default router;
