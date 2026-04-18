import crypto from "crypto";
import Room from "../models/Room.js";

// ── Helper: generate a readable 6-char room ID ────────────────────────────────
function generateRoomId() {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // e.g. "A3F9B2"
}

// @desc    Create a new room
// @route   POST /api/rooms/create
// @access  Private
export const createRoom = async (req, res) => {
  const { password, name } = req.body;
  const userId = req.user._id;

  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  try {
    // Keep generating until we get a unique ID (collision is rare but possible)
    let roomId;
    let exists = true;
    while (exists) {
      roomId = generateRoomId();
      exists = await Room.findOne({ roomId });
    }

    const room = new Room({
      roomId,
      password,
      name: name?.trim() || "Unnamed Shelf",
      createdBy: userId,
      members: [userId],
    });

    await room.save();

    res.status(201).json({
      roomId: room.roomId,
      name: room.name,
      message: "Room created successfully",
    });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Server error creating room" });
  }
};

// @desc    Join an existing room
// @route   POST /api/rooms/join
// @access  Private
export const joinRoom = async (req, res) => {
  const { roomId, password } = req.body;
  const userId = req.user._id;

  if (!roomId || !password) {
    return res.status(400).json({ message: "Room ID and password are required" });
  }

  try {
    const room = await Room.findOne({ roomId: roomId.toUpperCase().trim() });

    if (!room) {
      return res.status(404).json({ message: "Room not found. Check the Room ID." });
    }

    const isMatch = await room.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    // Add user to members if not already in
    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
    }

    res.json({
      roomId: room.roomId,
      name: room.name,
      message: "Joined room successfully",
    });
  } catch (error) {
    console.error("Error joining room:", error);
    res.status(500).json({ message: "Server error joining room" });
  }
};
