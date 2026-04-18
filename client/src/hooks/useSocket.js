// src/hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5001";

export function useSocket(roomId) {
  const [onlineCount, setOnlineCount] = useState(0);
  const [weather, setWeather] = useState("FOGGY");
  const [cursors, setCursors] = useState({});
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const lastCursorSend = useRef(0);
  const cursorTimers = useRef({});
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !roomId) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
    });
    socketRef.current = socket;

    // ── JOIN the socket.io room once connected ────────────────────────────────
    // This tells the server to scope all events to this roomId
    const joinRoom = () => {
      socket.emit("JOIN_ROOM", { roomId });
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
    }

    const onMessage = (data) => {
      switch (data.type) {
        case "PRESENCE":
          setOnlineCount(data.onlineCount);
          break;

        case "INIT":
          setOnlineCount(data.onlineCount);
          break;

        case "CURSOR_MOVE":
          setCursors((prev) => ({
            ...prev,
            [data.socketId]: { x: data.x, y: data.y, username: data.username },
          }));

          if (cursorTimers.current[data.socketId]) {
            clearTimeout(cursorTimers.current[data.socketId]);
          }
          cursorTimers.current[data.socketId] = setTimeout(() => {
            setCursors((prev) => {
              const next = { ...prev };
              delete next[data.socketId];
              return next;
            });
            delete cursorTimers.current[data.socketId];
          }, 10000);
          break;

        case "LINK_ADDED":
          if (window.__shelfOnLinkAdded) {
            window.__shelfOnLinkAdded(data.card, data.addedBy);
          }
          break;

        case "EMOJI_REACTION": {
          const id = Date.now() + Math.random();
          setFloatingEmojis((prev) => [
            ...prev,
            {
              id,
              cardId: data.cardId,
              emoji: data.emoji,
              username: data.username,
              fromSelf: data.fromSelf,
            },
          ]);
          setTimeout(() => {
            setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
          }, 1800);
          break;
        }

        case "WEATHER_UPDATE":
          setWeather(data.weather);
          setOnlineCount(data.onlineCount);
          break;

        default:
          break;
      }
    };

    socket.on("message", onMessage);

    return () => {
      socket.off("message", onMessage);
      socket.off("connect", joinRoom);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]); // re-run if roomId changes

  // ── SEND CURSOR (throttled 20fps) ─────────────────────────────────────────
  const sendCursor = useCallback((x, y) => {
    if (!socketRef.current?.connected) return;
    const now = Date.now();
    if (now - lastCursorSend.current < 50) return;
    lastCursorSend.current = now;
    socketRef.current.emit("CURSOR_MOVE", { x, y });
  }, []);

  // ── SEND EMOJI REACTION ───────────────────────────────────────────────────
  const sendReaction = useCallback((cardId, emoji) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("EMOJI_REACTION", { cardId, emoji });
    socketRef.current.emit("ACTIVITY_PING");
  }, []);

  const ping = useCallback(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("ACTIVITY_PING");
  }, []);

  return {
    onlineCount,
    weather,
    cursors,
    floatingEmojis,
    sendCursor,
    sendReaction,
    ping,
  };
}
