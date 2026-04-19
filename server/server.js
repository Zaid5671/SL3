import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import userRoutes from "./routes/userRoutes.js";
import linkRoutes from "./routes/linkRoutes.js";
import roomRoutes from "./routes/roomRoutes.js"; // ← NEW
import projectRoutes from "./routes/projectRoutes.js";
import { runContextFeedSweep } from "./services/contextFeedService.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// Make io accessible in controllers via app.locals
app.locals.io = io;

app.use(express.json());
app.use(
  cors({
    origin: "https://sl-3.vercel.app", // Replace with your actual Vercel URL
    credentials: true,
  }),
);
app.use("/api/users", userRoutes);
app.use("/api/links", linkRoutes);
app.use("/api/rooms", roomRoutes); // ← NEW
app.use("/api/projects", projectRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Connected!"))
  .catch((err) => console.log("Database Error:", err));

app.get("/api/health", (req, res) => {
  res.json({ message: "SHELFLIFE Server is alive!" });
});

// Context Feed sweep: checks cards due for a grounded refresh.
setInterval(
  async () => {
    try {
      const result = await runContextFeedSweep({ limit: 8 });
      if (result.processed > 0) {
        console.log(`🧠 Context Feed refreshed for ${result.processed} cards.`);
      }
    } catch (error) {
      console.error("Context Feed sweep error:", error.message || error);
    }
  },
  6 * 60 * 60 * 1000,
);

setTimeout(async () => {
  try {
    const result = await runContextFeedSweep({ limit: 8 });
    if (result.processed > 0) {
      console.log(
        `🧠 Initial Context Feed refresh processed ${result.processed} cards.`,
      );
    }
  } catch (error) {
    console.error("Initial Context Feed sweep error:", error.message || error);
  }
}, 20_000);

// ─── SOCKET.IO LOGIC ──────────────────────────────────────────────────────────

// Track connected clients: socketId → { userId, username, roomId }
const connectedUsers = new Map();

// Per-room activity counter for Shelf Weather: roomId → pingCount
const roomActivity = new Map();

// Broadcast to all sockets in a specific room
function broadcastToRoom(roomId, type, payload) {
  io.to(roomId).emit("message", { type, ...payload });
}

// Shelf Weather: check every 60 seconds per room
setInterval(() => {
  roomActivity.forEach((pings, roomId) => {
    const weather = pings > 30 ? "STORMY" : pings > 10 ? "BREEZY" : "FOGGY";

    // Count how many users are in this room
    let roomOnline = 0;
    connectedUsers.forEach((u) => {
      if (u.roomId === roomId) roomOnline++;
    });

    broadcastToRoom(roomId, "WEATHER_UPDATE", {
      weather,
      pings,
      onlineCount: roomOnline,
    });

    console.log(`🌦️  Room ${roomId} Weather: ${weather} (${pings} pings)`);
    roomActivity.set(roomId, 0); // reset for next interval
  });
}, 60_000);

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ── 1. AUTH: Verify JWT token sent on connection ──────────────────────────
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.log("❌ No token, disconnecting socket:", socket.id);
    socket.disconnect();
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.log("❌ Invalid token, disconnecting socket:", socket.id);
    socket.disconnect();
    return;
  }

  const userId = decoded.user.id;
  const username = decoded.user.username || "Anonymous";

  // ── 2. JOIN ROOM: client sends roomId after auth ──────────────────────────
  // Frontend must emit: socket.emit("JOIN_ROOM", { roomId: "A3F9B2" })
  socket.on("JOIN_ROOM", ({ roomId }) => {
    if (!roomId) return;

    const upperRoomId = roomId.toUpperCase().trim();

    // Leave any previous room first
    const prev = connectedUsers.get(socket.id);
    if (prev?.roomId) {
      socket.leave(prev.roomId);
      // Notify old room someone left
      const oldCount = [...connectedUsers.values()].filter(
        (u) => u.roomId === prev.roomId,
      ).length;
      broadcastToRoom(prev.roomId, "PRESENCE", { onlineCount: oldCount });
    }

    // Join the socket.io room (this is how events get scoped)
    socket.join(upperRoomId);

    // Store user info with their roomId
    connectedUsers.set(socket.id, { userId, username, roomId: upperRoomId });

    // Initialize activity counter for this room if needed
    if (!roomActivity.has(upperRoomId)) roomActivity.set(upperRoomId, 0);

    // Count online users in this room
    const roomOnline = [...connectedUsers.values()].filter(
      (u) => u.roomId === upperRoomId,
    ).length;

    // Tell everyone in the room about the new member
    broadcastToRoom(upperRoomId, "PRESENCE", { onlineCount: roomOnline });

    // Tell this socket their identity + room info
    socket.emit("message", {
      type: "INIT",
      socketId: socket.id,
      onlineCount: roomOnline,
      roomId: upperRoomId,
    });

    console.log(
      `✅ ${username} joined room ${upperRoomId} (socket: ${socket.id})`,
    );
  });

  // ── 3. CURSOR MOVE — scoped to room ──────────────────────────────────────
  socket.on("CURSOR_MOVE", (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user?.roomId) return;

    // Increment activity for this room
    roomActivity.set(user.roomId, (roomActivity.get(user.roomId) || 0) + 1);

    // Relay to all OTHER clients in the same room
    socket.to(user.roomId).emit("message", {
      type: "CURSOR_MOVE",
      socketId: socket.id,
      username: user.username,
      x: data.x,
      y: data.y,
    });
  });

  // ── 4. EMOJI REACTION — scoped to room ───────────────────────────────────
  socket.on("EMOJI_REACTION", (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user?.roomId) return;

    roomActivity.set(user.roomId, (roomActivity.get(user.roomId) || 0) + 1);

    const payload = {
      socketId: socket.id,
      username: user.username,
      cardId: data.cardId,
      emoji: data.emoji,
    };

    // Send to everyone else in the room
    socket
      .to(user.roomId)
      .emit("message", { type: "EMOJI_REACTION", ...payload, fromSelf: false });

    // Echo back to sender so their animation also fires
    socket.emit("message", {
      type: "EMOJI_REACTION",
      ...payload,
      fromSelf: true,
    });
  });

  // ── 5. ACTIVITY PING ─────────────────────────────────────────────────────
  socket.on("ACTIVITY_PING", () => {
    const user = connectedUsers.get(socket.id);
    if (!user?.roomId) return;
    roomActivity.set(user.roomId, (roomActivity.get(user.roomId) || 0) + 1);
  });

  // ── 6. DISCONNECT ─────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);

    if (user?.roomId) {
      const roomOnline = [...connectedUsers.values()].filter(
        (u) => u.roomId === user.roomId,
      ).length;
      broadcastToRoom(user.roomId, "PRESENCE", { onlineCount: roomOnline });
      console.log(
        `❌ ${user.username} left room ${user.roomId} | Room online: ${roomOnline}`,
      );
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
