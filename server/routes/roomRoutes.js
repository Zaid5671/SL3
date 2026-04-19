import express from "express";
import {
  createRoom,
  joinRoom,
  setRoomVisibility,
  getPublicRooms,
  forkPublicRoom,
  getRoomLineage,
} from "../controllers/roomController.js";
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
router.put("/:roomId/visibility", authMiddleware, setRoomVisibility);
router.get("/public", authMiddleware, getPublicRooms);
router.post("/:roomId/fork", authMiddleware, forkPublicRoom);
router.get("/:roomId/lineage", authMiddleware, getRoomLineage);

export default router;
