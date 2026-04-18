import express from "express";
import { createRoom, joinRoom } from "../controllers/roomController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// @route   POST /api/rooms/create
// @desc    Create a new collaborative room
// @access  Private
router.post("/create", authMiddleware, createRoom);

// @route   POST /api/rooms/join
// @desc    Join an existing room with roomId + password
// @access  Private
router.post("/join", authMiddleware, joinRoom);

export default router;
