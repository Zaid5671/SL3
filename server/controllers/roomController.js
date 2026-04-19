import crypto from "crypto";
import Room from "../models/Room.js";
import Link from "../models/Link.js";
import { initializeContextFeedForNewLink } from "../services/contextFeedService.js";

// ── Helper: generate a readable 6-char room ID ────────────────────────────────
function generateRoomId() {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // e.g. "A3F9B2"
}

// @desc    Create a new room
// @route   POST /api/rooms/create
// @access  Private
export const createRoom = async (req, res) => {
  const { password, name, isPublic } = req.body;
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
      isPublic: Boolean(isPublic),
      lineageDepth: 0,
      remixCount: 0,
    });
    room.rootRoom = room._id;

    await room.save();

    res.status(201).json({
      roomId: room.roomId,
      name: room.name,
      isPublic: room.isPublic,
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
    return res
      .status(400)
      .json({ message: "Room ID and password are required" });
  }

  try {
    const room = await Room.findOne({ roomId: roomId.toUpperCase().trim() });

    if (!room) {
      return res
        .status(404)
        .json({ message: "Room not found. Check the Room ID." });
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

// @desc    Toggle room visibility
// @route   PUT /api/rooms/:roomId/visibility
// @access  Private (creator only)
export const setRoomVisibility = async (req, res) => {
  const { roomId } = req.params;
  const { isPublic } = req.body;

  if (typeof isPublic !== "boolean") {
    return res.status(400).json({ message: "isPublic must be a boolean" });
  }

  try {
    const room = await Room.findOne({ roomId: roomId.toUpperCase().trim() });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (String(room.createdBy) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Only the room creator can change visibility" });
    }

    room.isPublic = isPublic;
    await room.save();

    return res.json({
      roomId: room.roomId,
      isPublic: room.isPublic,
      message: room.isPublic
        ? "Room is now public and remixable"
        : "Room is now private",
    });
  } catch (error) {
    console.error("Error setting room visibility:", error);
    return res
      .status(500)
      .json({ message: "Server error updating visibility" });
  }
};

// @desc    List all public shelves that can be forked
// @route   GET /api/rooms/public
// @access  Private
export const getPublicRooms = async (_req, res) => {
  try {
    const rooms = await Room.find({ isPublic: true })
      .populate("createdBy", "username")
      .populate("parentRoom", "roomId name")
      .sort({ createdAt: -1 })
      .lean();

    const payload = await Promise.all(
      rooms.map(async (room) => {
        const rootId = room.rootRoom || room._id;
        const totalRemixes = await Room.countDocuments({
          rootRoom: rootId,
          _id: { $ne: rootId },
        });

        return {
          roomId: room.roomId,
          name: room.name,
          isPublic: room.isPublic,
          createdAt: room.createdAt,
          createdBy: {
            id: room.createdBy?._id,
            username: room.createdBy?.username || "Unknown",
          },
          parentRoomId: room.parentRoom?.roomId || null,
          lineageDepth: room.lineageDepth || 0,
          remixCount: room.remixCount || 0,
          totalRemixes,
        };
      }),
    );

    return res.json(payload);
  } catch (error) {
    console.error("Error fetching public rooms:", error);
    return res
      .status(500)
      .json({ message: "Server error fetching public rooms" });
  }
};

// @desc    Fork a public shelf into a new private/public branch
// @route   POST /api/rooms/:roomId/fork
// @access  Private
export const forkPublicRoom = async (req, res) => {
  const sourceRoomId = req.params.roomId?.toUpperCase().trim();
  const { password, name, isPublic } = req.body;
  const userId = req.user._id;

  if (!password) {
    return res
      .status(400)
      .json({ message: "Password is required for the fork" });
  }

  try {
    const sourceRoom = await Room.findOne({ roomId: sourceRoomId }).lean();
    if (!sourceRoom) {
      return res.status(404).json({ message: "Source room not found" });
    }

    if (!sourceRoom.isPublic) {
      return res
        .status(403)
        .json({ message: "Only public shelves can be forked" });
    }

    let forkRoomId;
    let exists = true;
    while (exists) {
      forkRoomId = generateRoomId();
      exists = await Room.findOne({ roomId: forkRoomId });
    }

    const rootId = sourceRoom.rootRoom || sourceRoom._id;
    const forkedRoom = new Room({
      roomId: forkRoomId,
      password,
      name: name?.trim() || `${sourceRoom.name} Remix`,
      createdBy: userId,
      members: [userId],
      isPublic: Boolean(isPublic),
      parentRoom: sourceRoom._id,
      rootRoom: rootId,
      lineageDepth: (sourceRoom.lineageDepth || 0) + 1,
      remixCount: 0,
    });

    await forkedRoom.save();

    await Room.updateOne({ _id: sourceRoom._id }, { $inc: { remixCount: 1 } });

    const sourceLinks = await Link.find({
      roomId: sourceRoom.roomId,
      $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
    }).lean();

    if (sourceLinks.length) {
      const now = new Date();
      const copiedLinks = sourceLinks.map((link) => ({
        user: userId,
        roomId: forkedRoom.roomId,
        project: null,
        originalUrl: link.originalUrl,
        title: link.title,
        content: link.content,
        summary: link.summary,
        source: link.source,
        vibe: link.vibe,
        icon: link.icon,
        decay: 0,
        isArchived: false,
        ...initializeContextFeedForNewLink(now),
      }));

      await Link.insertMany(copiedLinks);
    }

    return res.status(201).json({
      roomId: forkedRoom.roomId,
      name: forkedRoom.name,
      isPublic: forkedRoom.isPublic,
      parentRoomId: sourceRoom.roomId,
      rootRoomId: sourceRoom.rootRoom || sourceRoom._id,
      clonedCards: sourceLinks.length,
      message: "Shelf forked successfully",
    });
  } catch (error) {
    console.error("Error forking room:", error);
    return res.status(500).json({ message: "Server error forking shelf" });
  }
};

// @desc    Get lineage tree for a shelf
// @route   GET /api/rooms/:roomId/lineage
// @access  Private (member for private rooms, open for public rooms)
export const getRoomLineage = async (req, res) => {
  const targetRoomId = req.params.roomId?.toUpperCase().trim();

  try {
    const targetRoom = await Room.findOne({ roomId: targetRoomId });
    if (!targetRoom) {
      return res.status(404).json({ message: "Room not found" });
    }

    const canViewPrivate = targetRoom.members.some(
      (memberId) => String(memberId) === String(req.user._id),
    );

    if (!targetRoom.isPublic && !canViewPrivate) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this lineage" });
    }

    const rootId = targetRoom.rootRoom || targetRoom._id;
    const rooms = await Room.find({
      $or: [{ _id: rootId }, { rootRoom: rootId }],
    })
      .populate("createdBy", "username")
      .populate("parentRoom", "roomId")
      .sort({ lineageDepth: 1, createdAt: 1 })
      .lean();

    const rootRoom = rooms.find((room) => String(room._id) === String(rootId));

    const nodes = rooms.map((room) => ({
      id: String(room._id),
      roomId: room.roomId,
      name: room.name,
      isPublic: room.isPublic,
      lineageDepth: room.lineageDepth || 0,
      parentRoomId: room.parentRoom?.roomId || null,
      remixCount: room.remixCount || 0,
      createdAt: room.createdAt,
      creator: room.createdBy?.username || "Unknown",
    }));

    const edges = nodes
      .filter((node) => node.parentRoomId)
      .map((node) => ({ from: node.parentRoomId, to: node.roomId }));

    return res.json({
      roomId: targetRoom.roomId,
      rootRoomId: rootRoom?.roomId || targetRoom.roomId,
      originalCurator: rootRoom?.createdBy?.username || "Unknown",
      totalRemixes: Math.max(0, nodes.length - 1),
      nodes,
      edges,
    });
  } catch (error) {
    console.error("Error fetching room lineage:", error);
    return res.status(500).json({ message: "Server error fetching lineage" });
  }
};
