import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ScrollAnimationCanvas from "../components/ScrollAnimationCanvas";
import FloatingOrbs from "../components/FloatingOrbs";

import SummaryModal from "../components/SummaryModal";
import { useSocket } from "../hooks/useSocket";

// ─── UTILITY: DecryptedText ──────────────────────────────────────────────────
const REACTION_EMOJIS = ["🔥", "💀", "⚡", "👀", "🤯"];

function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.user?.id || null;
  } catch {
    return null;
  }
}

function getUsernameFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.user?.username || null;
  } catch {
    return null;
  }
}

function LiveCursors({ cursors }) {
  return (
    <>
      {Object.entries(cursors).map(([socketId, position]) => (
        <div
          key={socketId}
          style={{
            position: "fixed",
            left: `${position.x}%`,
            top: `${position.y}%`,
            pointerEvents: "none",
            zIndex: 9998,
            transition: "left 0.08s linear, top 0.08s linear",
            transform: "translate(-2px, -2px)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M2 2L16 8L9 10L7 16L2 2Z"
              fill="#00D6FF"
              stroke="#fff"
              strokeWidth="1"
            />
          </svg>
          <div
            style={{
              marginTop: 2,
              background: "#00D6FF",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'Inter',sans-serif",
              padding: "2px 8px",
              borderRadius: 999,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,214,255,0.5)",
            }}
          >
            {position.username}
          </div>
        </div>
      ))}
    </>
  );
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const timeout = setTimeout(onDone, 4000);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: 20, x: "-50%" }}
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        zIndex: 9999,
        whiteSpace: "nowrap",
        background: "rgba(0,214,255,0.15)",
        border: "1px solid rgba(0,214,255,0.4)",
        borderRadius: 999,
        padding: "10px 20px",
        fontFamily: "'Inter',sans-serif",
        fontSize: 13,
        color: "#00D6FF",
        fontWeight: 600,
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
      }}
    >
      {message}
    </motion.div>
  );
}

function DecryptedText({ text = "", trigger = false, speed = 25 }) {
  const CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const [display, setDisplay] = useState(text);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!trigger) {
      setDisplay(text);
      return;
    }
    let frame = 0;
    const steps = text.length * 2;
    const tick = () => {
      frame++;
      const revealed = Math.floor((frame / steps) * text.length);
      setDisplay(
        text
          .split("")
          .map((ch, i) =>
            i < revealed
              ? ch
              : ch === " "
                ? " "
                : CHARS[Math.floor(Math.random() * CHARS.length)],
          )
          .join(""),
      );
      if (revealed < text.length) timerRef.current = setTimeout(tick, speed);
      else setDisplay(text);
    };
    timerRef.current = setTimeout(tick, speed);
    return () => clearTimeout(timerRef.current);
  }, [trigger, text, speed]);

  return <>{display}</>;
}

// ─── DATA & CONFIG ───────────────────────────────────────────────────────────
const VIBE_CFG = {
  "High-Signal": {
    bg: "rgba(59, 130, 246, 0.18)",
    pill: "rgba(59, 130, 246, 0.22)",
    pillTxt: "#3B82F6",
    border: "rgba(59, 130, 246, 0.34)",
    shadow: "rgba(59, 130, 246, 0.32)",
  },
  Educational: {
    bg: "rgba(16, 185, 129, 0.18)",
    pill: "rgba(16, 185, 129, 0.22)",
    pillTxt: "#10B981",
    border: "rgba(16, 185, 129, 0.34)",
    shadow: "rgba(16, 185, 129, 0.32)",
  },
  Chaotic: {
    bg: "rgba(249, 115, 22, 0.18)",
    pill: "rgba(249, 115, 22, 0.24)",
    pillTxt: "#F97316",
    border: "rgba(249, 115, 22, 0.36)",
    shadow: "rgba(249, 115, 22, 0.32)",
  },
  Cursed: {
    bg: "rgba(163, 230, 53, 0.18)",
    pill: "rgba(163, 230, 53, 0.24)",
    pillTxt: "#A3E635",
    border: "rgba(163, 230, 53, 0.36)",
    shadow: "rgba(163, 230, 53, 0.32)",
  },
  Wholesome: {
    bg: "rgba(244, 114, 182, 0.18)",
    pill: "rgba(244, 114, 182, 0.24)",
    pillTxt: "#F472B6",
    border: "rgba(244, 114, 182, 0.36)",
    shadow: "rgba(244, 114, 182, 0.32)",
  },
  Insightful: {
    bg: "rgba(99, 102, 241, 0.18)",
    pill: "rgba(99, 102, 241, 0.24)",
    pillTxt: "#6366F1",
    border: "rgba(99, 102, 241, 0.36)",
    shadow: "rgba(99, 102, 241, 0.32)",
  },
  Controversial: {
    bg: "rgba(239, 68, 68, 0.18)",
    pill: "rgba(239, 68, 68, 0.24)",
    pillTxt: "#EF4444",
    border: "rgba(239, 68, 68, 0.36)",
    shadow: "rgba(239, 68, 68, 0.32)",
  },
  Funny: {
    bg: "rgba(251, 191, 36, 0.18)",
    pill: "rgba(251, 191, 36, 0.24)",
    pillTxt: "#FBBF24",
    border: "rgba(251, 191, 36, 0.36)",
    shadow: "rgba(251, 191, 36, 0.32)",
  },
};

const LOADING_PHRASES = [
  "INITIALIZING NEURAL SCRAPER...",
  "BYPASSING PAYWALLS...",
  "EXTRACTING CONTEXTUAL VIBES...",
  "DISTILLING INFORMATION...",
  "GENERATING SHELFLIFE SUMMARY...",
];

const getCardDaysAgo = (updatedAt, createdAt) => {
  const baseTime = new Date(updatedAt || createdAt).getTime();
  if (Number.isNaN(baseTime)) return "Unknown";

  const dayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.max(0, Math.floor((Date.now() - baseTime) / dayMs));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
};

// ─── CARD COMPONENT ──────────────────────────────────────────────────────────
function GridCard({
  card,
  index,
  onReact,
  floatingEmojis,
  onDelete,
  onCardClick,
  availableProjects,
  onMoveProject,
}) {
  const v = VIBE_CFG[card.vibe] || VIBE_CFG["Educational"];
  const normalizedDecay = Math.max(0, Math.min(100, Number(card.decay) || 0));
  const decayRatio = normalizedDecay / 100;
  const darkOverlayAlpha = Math.max(0.04, 0.24 - decayRatio * 0.16);
  const cardSaturation = Math.max(0.45, 1 - decayRatio * 0.55);
  const cardBrightness = Math.min(1.04, 0.72 + decayRatio * 0.32);

  const titleColor = `rgba(255,255,255,${Math.max(0.66, 0.95 - decayRatio * 0.22)})`;
  const summaryColor = `rgba(255,255,255,${Math.max(0.38, 0.62 - decayRatio * 0.22)})`;
  const metaColor = `rgba(255,255,255,${Math.max(0.3, 0.45 - decayRatio * 0.15)})`;

  const cardEmojis = floatingEmojis
    ? floatingEmojis.filter((emojiItem) => emojiItem.cardId === card._id)
    : [];
  const [pressedEmoji, setPressedEmoji] = useState(null);

  const handleReact = (event, emoji) => {
    event.stopPropagation();
    setPressedEmoji(emoji);
    setTimeout(() => setPressedEmoji(null), 300);
    if (onReact) onReact(card._id, emoji);
  };

  const currentProjectId =
    typeof card.project === "string" ? card.project : (card.project?._id ?? "");
  const [targetProjectId, setTargetProjectId] = useState(currentProjectId);

  useEffect(() => {
    setTargetProjectId(currentProjectId);
  }, [currentProjectId]);

  const handleMove = async (event) => {
    event.stopPropagation();
    if (!onMoveProject) return;
    await onMoveProject(card._id, targetProjectId || null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.05,
        type: "spring",
        stiffness: 200,
        damping: 20,
      }}
      whileHover={{
        y: -8,
        scale: 1.02,
        boxShadow: `0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)`,
      }}
      onClick={() => onCardClick && onCardClick(card)}
      style={{
        width: "100%",
        height: "100%",
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: `linear-gradient(rgba(0,0,0,${darkOverlayAlpha}), rgba(0,0,0,${darkOverlayAlpha})), ${v.bg}`,
        filter: `saturate(${cardSaturation}) brightness(${cardBrightness})`,
        backdropFilter: "blur(32px) saturate(180%)",
        WebkitBackdropFilter: "blur(32px) saturate(180%)",
        border: `1px solid rgba(255,255,255,${Math.max(0.04, 0.12 - decayRatio * 0.08)})`,
        borderRadius: "32px",
        padding: "32px",
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        boxShadow:
          "0 10px 28px 0 rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
        transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <AnimatePresence>
        {cardEmojis.map((emojiItem) => (
          <motion.div
            key={emojiItem.id}
            initial={{ opacity: 1, y: 10, scale: 0.6, x: "-50%" }}
            animate={{ opacity: 0, y: -70, scale: 1.6, x: "-50%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.2, 0.8, 0.4, 1] }}
            style={{
              position: "absolute",
              bottom: "76px",
              left: "50%",
              fontSize: 32,
              pointerEvents: "none",
              zIndex: 20,
              filter: "drop-shadow(0 0 8px rgba(255,255,255,0.4))",
            }}
          >
            {emojiItem.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Vibe and Time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: "999px",
            background: v.pill,
            color: v.pillTxt,
            border: `1px solid ${v.border}`,
          }}
        >
          {card.icon} &nbsp; {card.vibe}
        </span>
        <span
          style={{
            fontSize: "13px",
            color: metaColor,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {getCardDaysAgo(card.updatedAt, card.createdAt)}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "20px",
          fontWeight: 700,
          lineHeight: 1.3,
          letterSpacing: "-0.3px",
          margin: 0,
          color: titleColor,
        }}
      >
        {card.title}
      </h3>

      {/* Summary */}
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "15px",
          fontWeight: 400,
          lineHeight: 1.6,
          margin: 0,
          flex: 1,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          color: summaryColor,
        }}
      >
        {card.summary}
      </p>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontFamily: "'Inter', sans-serif",
              color: metaColor,
              flex: 1,
              minWidth: 0,
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            🔗 {card.source}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {REACTION_EMOJIS.map((emoji) => (
              <motion.button
                key={emoji}
                onClick={(event) => handleReact(event, emoji)}
                animate={
                  pressedEmoji === emoji
                    ? {
                        scale: [1, 1.5, 0.9, 1.1, 1],
                        rotate: [0, -10, 10, -5, 0],
                      }
                    : { scale: 1 }
                }
                transition={{ duration: 0.4 }}
                whileHover={{ scale: 1.25, y: -3 }}
                whileTap={{ scale: 0.85 }}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: "4px 8px",
                  fontSize: 14,
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.8)",
                  transition: "background 0.15s",
                }}
              >
                {emoji}
              </motion.button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginLeft: "auto",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: 6 }}
              onClick={(event) => event.stopPropagation()}
            >
              <select
                value={targetProjectId}
                onChange={(event) => setTargetProjectId(event.target.value)}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.85)",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  fontSize: "12px",
                  fontFamily: "'Inter', sans-serif",
                  maxWidth: 140,
                  cursor: "pointer",
                }}
              >
                <option value="" style={{ background: "#0b1020" }}>
                  No project
                </option>
                {(availableProjects || []).map((project) => (
                  <option
                    key={project._id}
                    value={project._id}
                    style={{ background: "#0b1020" }}
                  >
                    {project.title}
                  </option>
                ))}
              </select>

              <button
                onClick={handleMove}
                style={{
                  background: "rgba(0,214,255,0.1)",
                  border: "1px solid rgba(0,214,255,0.25)",
                  color: "#00D6FF",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  fontSize: "12px",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Move
              </button>
            </div>

            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(card._id);
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#EF4444",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "rgba(239, 68, 68, 0.2)";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "rgba(239, 68, 68, 0.1)";
                }}
              >
                Delete
              </button>
            )}

            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm("Move to Graveyard?")) {
                  const token = localStorage.getItem("token");
                  try {
                    await axios.put(
                      `/api/links/${card._id}/archive`,
                      {},
                      { headers: { Authorization: `Bearer ${token}` } },
                    );
                    window.dispatchEvent(
                      new CustomEvent("linkArchived", { detail: card._id }),
                    );
                  } catch (err) {
                    console.error(err);
                  }
                }
              }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.8)",
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "12px",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseOver={(e) => {
                e.target.style.background = "rgba(255,255,255,0.1)";
                e.target.style.color = "rgba(255,255,255,1)";
                e.target.style.borderColor = "rgba(255,255,255,0.2)";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "rgba(255,255,255,0.03)";
                e.target.style.color = "rgba(255,255,255,0.8)";
                e.target.style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              Archive
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProjectCard({
  project,
  index,
  cardCount,
  onOpen,
  onRename,
  onDelete,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.05,
        type: "spring",
        stiffness: 200,
        damping: 20,
      }}
      whileHover={{
        y: -8,
        scale: 1.02,
        boxShadow:
          "0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
      onClick={onOpen}
      style={{
        width: "100%",
        height: "100%",
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "rgba(0, 214, 255, 0.03)",
        backdropFilter: "blur(32px) saturate(180%)",
        WebkitBackdropFilter: "blur(32px) saturate(180%)",
        border: "1px solid rgba(0, 214, 255, 0.18)",
        borderRadius: "32px",
        padding: "32px",
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        boxShadow:
          "0 12px 40px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
        transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: "999px",
            background: "rgba(0, 214, 255, 0.1)",
            color: "#00D6FF",
            border: "1px solid rgba(0, 214, 255, 0.2)",
          }}
        >
          📁 Project
        </span>
        <span
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.45)",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {cardCount} cards
        </span>
      </div>

      <h3
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "24px",
          fontWeight: 700,
          lineHeight: 1.3,
          letterSpacing: "-0.3px",
          margin: 0,
          color: "rgba(255,255,255,0.95)",
        }}
      >
        {project.title}
      </h3>

      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "15px",
          fontWeight: 400,
          lineHeight: 1.6,
          margin: 0,
          flex: 1,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical",
          color: "rgba(255,255,255,0.60)",
        }}
      >
        {project.description || "No description added yet."}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontFamily: "'Inter', sans-serif",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          Open project view
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={(event) => {
              event.stopPropagation();
              if (onRename) onRename(project);
            }}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.8)",
              borderRadius: "10px",
              padding: "7px 10px",
              fontSize: "12px",
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
            }}
          >
            Rename
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              if (onDelete) onDelete(project);
            }}
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#EF4444",
              borderRadius: "10px",
              padding: "7px 10px",
              fontSize: "12px",
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
          <span style={{ color: "#00D6FF", fontSize: 18 }}>→</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── DASHBOARD PAGE ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const tokenUserId = getUserIdFromToken(token);
  const tokenUsername = getUsernameFromToken(token);

  const expectedPersonalId = tokenUserId ? `PERSONAL_${tokenUserId}` : null;
  const storedRoomId = sessionStorage.getItem("shelfRoomId");
  const storedRoomName = sessionStorage.getItem("shelfRoomName");

  const shouldUsePersonalShelf =
    !!expectedPersonalId &&
    (!storedRoomId ||
      storedRoomId.startsWith("PERSONAL_") ||
      storedRoomName === "My Personal Shelf");

  const roomId = shouldUsePersonalShelf
    ? expectedPersonalId
    : (storedRoomId ?? null);
  const roomName = shouldUsePersonalShelf
    ? "My Personal Shelf"
    : (storedRoomName ?? null);
  const isPersonalSpace =
    shouldUsePersonalShelf || roomName === "My Personal Shelf";

  const [cards, setCards] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success
  const [summaryData, setSummaryData] = useState(null);
  const [loadingPhraseIdx, setLoadingPhraseIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [toast, setToast] = useState(null);

  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const {
    onlineCount,
    weather,
    cursors,
    floatingEmojis,
    sendCursor,
    sendReaction,
    ping,
  } = useSocket(roomId);

  useEffect(() => {
    if (!expectedPersonalId) return;
    if (
      shouldUsePersonalShelf &&
      (storedRoomId !== expectedPersonalId ||
        storedRoomName !== "My Personal Shelf")
    ) {
      sessionStorage.setItem("shelfRoomId", expectedPersonalId);
      sessionStorage.setItem("shelfRoomName", "My Personal Shelf");
    }
  }, [
    expectedPersonalId,
    shouldUsePersonalShelf,
    storedRoomId,
    storedRoomName,
  ]);

  useEffect(() => {
    window.__shelfOnLinkAdded = (card, addedBy) => {
      if (
        isPersonalSpace &&
        tokenUserId &&
        String(card.user) !== String(tokenUserId)
      ) {
        return;
      }

      setCards((prev) => {
        if (prev.some((item) => item._id === card._id)) return prev;
        return [card, ...prev];
      });
      const adderName =
        addedBy ||
        (tokenUserId && String(card.user) === String(tokenUserId)
          ? tokenUsername
          : null) ||
        "Someone";
      setToast(`✦ ${adderName} just added: "${card.title.slice(0, 40)}..."`);
    };
    return () => {
      window.__shelfOnLinkAdded = null;
    };
  }, [isPersonalSpace, tokenUserId, tokenUsername]);

  useEffect(() => {
    const onMouseMove = (event) => {
      sendCursor(
        (event.clientX / window.innerWidth) * 100,
        (event.clientY / window.innerHeight) * 100,
      );
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [sendCursor]);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const token = localStorage.getItem("token");
        const params = {
          archived: false,
          ...(roomId ? { roomId } : {}),
          ...(isPersonalSpace ? { scope: "personal" } : {}),
        };
        const { data } = await axios.get("/api/links", {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        setCards(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching links:", error);
        setCards([]); // Also set to empty array on error
      }
    };
    fetchLinks();

    const handleArchive = (e) => {
      setCards((prev) => prev.filter((c) => c._id !== e.detail));
    };
    window.addEventListener("linkArchived", handleArchive);
    return () => window.removeEventListener("linkArchived", handleArchive);
  }, [roomId, isPersonalSpace]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");
        const params = {
          ...(roomId ? { roomId } : {}),
          ...(isPersonalSpace ? { scope: "personal" } : {}),
        };

        const { data } = await axios.get("/api/projects", {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });

        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setProjects([]);
      }
    };

    fetchProjects();
  }, [roomId, isPersonalSpace]);

  useEffect(() => {
    if (!activeProjectId) return;
    const stillExists = projects.some(
      (project) => project._id === activeProjectId,
    );
    if (!stillExists) {
      setActiveProjectId(null);
    }
  }, [projects, activeProjectId]);

  useEffect(() => {
    if (activeProjectId) {
      setSelectedProjectId(activeProjectId);
      return;
    }

    if (
      selectedProjectId &&
      !projects.some((p) => p._id === selectedProjectId)
    ) {
      setSelectedProjectId("");
    }
  }, [activeProjectId, projects, selectedProjectId]);

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/links/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCards((prev) => prev.filter((c) => c._id !== id));
      setToast("Link deleted forever 💀");
    } catch (err) {
      console.error(err);
      setToast("Failed to delete link.");
    }
  };

  const handleCreateProject = async (title, description) => {
    try {
      const token = localStorage.getItem("token");
      const payload = {
        title,
        description,
        ...(roomId ? { roomId } : {}),
        ...(isPersonalSpace ? { scope: "personal" } : {}),
      };

      const { data: newProject } = await axios.post("/api/projects", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProjects((prev) => [newProject, ...prev]);
      setSelectedProjectId(newProject._id);
      setToast(`Project \"${newProject.title}\" created.`);
      return newProject;
    } catch (error) {
      console.error("Error creating project:", error);
      setToast(error.response?.data?.message || "Failed to create project.");
      return null;
    }
  };

  const handleCreateProjectSubmit = async (event) => {
    event.preventDefault();

    const title = newProjectTitle.trim();
    if (!title) {
      setToast("Project title cannot be empty.");
      return;
    }

    const created = await handleCreateProject(
      title,
      newProjectDescription.trim(),
    );
    if (!created) return;

    setIsCreateProjectModalOpen(false);
    setNewProjectTitle("");
    setNewProjectDescription("");
  };

  const handleRenameProject = async (project) => {
    const nextTitle = window.prompt("Rename project", project.title);
    if (nextTitle === null) return;
    const title = nextTitle.trim();
    if (!title) {
      setToast("Project title cannot be empty.");
      return;
    }

    const nextDescription = window.prompt(
      "Update project description",
      project.description || "",
    );
    if (nextDescription === null) return;

    try {
      const token = localStorage.getItem("token");
      const { data: updated } = await axios.put(
        `/api/projects/${project._id}`,
        { title, description: nextDescription.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setProjects((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item)),
      );
      setToast(`Project \"${updated.title}\" updated.`);
    } catch (error) {
      console.error("Error renaming project:", error);
      setToast(error.response?.data?.message || "Failed to rename project.");
    }
  };

  const handleDeleteProject = async (project) => {
    if (
      !window.confirm(
        `Delete project \"${project.title}\"? Cards will remain, but removed from this project.`,
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/projects/${project._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProjects((prev) => prev.filter((item) => item._id !== project._id));
      setCards((prev) =>
        prev.map((card) => {
          const cardProjectId =
            typeof card.project === "string"
              ? card.project
              : (card.project?._id ?? null);
          if (cardProjectId !== project._id) return card;
          return { ...card, project: null };
        }),
      );

      if (activeProjectId === project._id) {
        setActiveProjectId(null);
      }

      setToast(`Project \"${project.title}\" deleted.`);
    } catch (error) {
      console.error("Error deleting project:", error);
      setToast(error.response?.data?.message || "Failed to delete project.");
    }
  };

  const handleMoveCardProject = async (cardId, nextProjectId) => {
    try {
      const token = localStorage.getItem("token");
      const payload = {
        projectId: nextProjectId || null,
      };

      const { data: updatedCard } = await axios.put(
        `/api/links/${cardId}/project`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setCards((prev) =>
        prev.map((card) => (card._id === updatedCard._id ? updatedCard : card)),
      );
      setToast("Card project updated.");
    } catch (error) {
      console.error("Error moving card:", error);
      setToast(error.response?.data?.message || "Failed to move card.");
    }
  };

  const getCardProjectId = (card) => {
    if (!card?.project) return null;
    if (typeof card.project === "string") return card.project;
    return card.project._id || null;
  };

  const matchesCardSearch = (card) => {
    const q = searchQuery.toLowerCase();
    return (
      card.title?.toLowerCase().includes(q) ||
      card.vibe?.toLowerCase().includes(q) ||
      card.source?.toLowerCase().includes(q)
    );
  };

  const matchesProjectSearch = (project) => {
    const q = searchQuery.toLowerCase();
    return (
      project.title?.toLowerCase().includes(q) ||
      project.description?.toLowerCase().includes(q)
    );
  };

  const projectCardCount = cards.reduce((acc, card) => {
    const projectKey = getCardProjectId(card);
    if (!projectKey) return acc;
    acc[projectKey] = (acc[projectKey] || 0) + 1;
    return acc;
  }, {});

  const activeProject =
    projects.find((project) => project._id === activeProjectId) || null;

  const visibleProjects = activeProjectId
    ? []
    : projects.filter((project) => matchesProjectSearch(project));

  const visibleCards = cards.filter((card) => {
    if (!matchesCardSearch(card)) return false;
    const projectKey = getCardProjectId(card);
    if (!activeProjectId) {
      return !projectKey;
    }
    return projectKey === activeProjectId;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus("loading");
    setSummaryData(null);
    setLoadingPhraseIdx(0);

    const phraseInterval = setInterval(() => {
      setLoadingPhraseIdx((prev) =>
        Math.min(prev + 1, LOADING_PHRASES.length - 1),
      );
    }, 1500);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        url,
        ...(roomId ? { roomId } : {}),
        ...(isPersonalSpace ? { scope: "personal" } : {}),
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
      };

      const { data: newCard } = await axios.post("/api/links/ingest", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      clearInterval(phraseInterval);
      setSummaryData(newCard);
      setStatus("success");
      setUrl("");

      setTimeout(() => {
        setCards((prev) => {
          if (prev.some((item) => item._id === newCard._id)) return prev;
          return [newCard, ...prev];
        });
        setStatus("idle");
        setSummaryData(null);
      }, 3500);
    } catch (error) {
      console.error("Error ingesting link:", error);
      clearInterval(phraseInterval);
      setStatus("idle");
    }
  };

  return (
    <>
      <LiveCursors cursors={cursors} />
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
      <SummaryModal
        isOpen={!!selectedCard}
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
      <AnimatePresence>
        {isCreateProjectModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10001,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={() => setIsCreateProjectModalOpen(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onSubmit={handleCreateProjectSubmit}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 520,
                borderRadius: 24,
                padding: 24,
                background: "rgba(11,16,32,0.95)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 24px 70px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.96)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                Create Project
              </h3>

              <input
                value={newProjectTitle}
                onChange={(event) => setNewProjectTitle(event.target.value)}
                placeholder="Project title"
                maxLength={80}
                autoFocus
                style={{
                  width: "100%",
                  borderRadius: 12,
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.92)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                }}
              />

              <textarea
                value={newProjectDescription}
                onChange={(event) =>
                  setNewProjectDescription(event.target.value)
                }
                placeholder="Project description"
                rows={4}
                maxLength={300}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.92)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />

              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateProjectModalOpen(false)}
                  style={{
                    borderRadius: 10,
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.8)",
                    fontFamily: "'Inter', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    borderRadius: 10,
                    padding: "10px 14px",
                    background: "rgba(0,214,255,0.12)",
                    border: "1px solid rgba(0,214,255,0.25)",
                    color: "#00D6FF",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Create
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        body { 
          margin: 0; 
          background: #000000; 
          color: rgba(255,255,255,0.92); 
          overflow-x: hidden; 
          font-family: 'Inter', sans-serif; 
          min-height: 100vh;
        }
        * { box-sizing: border-box; }

        .url-input {
          flex: 1;
          padding: 20px 28px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(24px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255,255,255,0.92);
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 16px;
          letter-spacing: 0.2px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.2);
        }
        .url-input:focus {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(0, 214, 255, 0.4);
          box-shadow: 0 0 0 4px rgba(0, 214, 255, 0.1), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .url-input::placeholder { color: rgba(255, 255, 255, 0.4); }

        .submit-btn {
          padding: 0 36px;
          border-radius: 20px;
          border: 1px solid rgba(0, 80, 255, 0.3);
          background: rgba(0, 80, 255, 0.15);
          backdrop-filter: blur(24px);
          color: #00D6FF;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0, 80, 255, 0.2);
        }
        .submit-btn:hover:not(:disabled) {
          background: rgba(0, 80, 255, 0.3);
          color: #fff;
          border-color: rgba(0, 214, 255, 0.5);
          box-shadow: 0 8px 24px rgba(0, 214, 255, 0.3);
          transform: translateY(-2px);
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(1);
        }

        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .scanner-line {
          position: absolute;
          top: 0; left: 0; right: 0; height: 100%;
          background: linear-gradient(to bottom, transparent, rgba(0, 214, 255, 0.2) 50%, #00D6FF 50%, transparent);
          animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          pointer-events: none;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      <Navbar roomOnlineCount={isPersonalSpace ? null : onlineCount} />

      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", minHeight: "400vh" }}
      >
        {/* Sticky Canvas Container */}
        <div
          style={{
            position: "sticky",
            top: 0,
            left: 0,
            width: "100%",
            height: "100vh",
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          <ScrollAnimationCanvas
            scrollYProgress={scrollYProgress}
            frameCount={240}
            imagePath="/1st/ezgif-frame-"
          />
          <FloatingOrbs />
        </div>

        {/* Overlay Content */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "-100vh",
          }}
        >
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "112px",
              paddingInline: "32px",
              paddingBottom: "100px",
              maxWidth: "1200px",
              width: "100%",
              margin: "0 auto",
            }}
          >
            {/* UPPER SECTION: ADD LINK */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: "100%", maxWidth: "800px", marginBottom: "80px" }}
            >
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: "40px" }}>
                <h1
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "64px",
                    fontWeight: 700,
                    letterSpacing: "-2px",
                    margin: "0 0 16px",
                    color: "rgba(255,255,255,0.95)",
                    lineHeight: 1.1,
                  }}
                >
                  Add to your ShelfLife
                </h1>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "18px",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.5)",
                    margin: 0,
                  }}
                >
                  Paste any URL. We'll extract the essence and categorize it.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  gap: "16px",
                  marginBottom: "40px",
                  position: "relative",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="url"
                  className="url-input"
                  placeholder="https://example.com/article..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={status !== "idle"}
                />
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={status !== "idle" || !url}
                >
                  {status === "loading" ? "Scanning..." : "Digest Link"}
                </button>

                {projects.length > 0 && (
                  <select
                    value={selectedProjectId}
                    onChange={(event) =>
                      setSelectedProjectId(event.target.value)
                    }
                    disabled={status !== "idle" || !!activeProject}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.9)",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "13px",
                    }}
                  >
                    <option value="" style={{ background: "#0b1020" }}>
                      Add as loose card (no project)
                    </option>
                    {projects.map((project) => (
                      <option
                        key={project._id}
                        value={project._id}
                        style={{ background: "#0b1020" }}
                      >
                        Add to project: {project.title}
                      </option>
                    ))}
                  </select>
                )}
              </form>

              {activeProject && (
                <div
                  style={{
                    marginTop: "-20px",
                    marginBottom: "24px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    borderRadius: "999px",
                    background: "rgba(0,214,255,0.08)",
                    border: "1px solid rgba(0,214,255,0.2)",
                    color: "#00D6FF",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  New cards will be added to: {activeProject.title}
                </div>
              )}

              {/* Dynamic Section (Loading / Success) */}
              <div style={{ minHeight: "150px" }}>
                <AnimatePresence mode="wait">
                  {/* LOADING STATE */}
                  {status === "loading" && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, scale: 0.98 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        style={{
                          position: "relative",
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "32px",
                          padding: "40px 30px",
                          textAlign: "center",
                          overflow: "hidden",
                          backdropFilter: "blur(32px) saturate(150%)",
                          WebkitBackdropFilter: "blur(32px) saturate(150%)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
                        }}
                      >
                        <div className="scanner-line" />

                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            border: "2px solid rgba(0, 214, 255, 0.3)",
                            borderTopColor: "#00D6FF",
                            margin: "0 auto 24px",
                            animation:
                              "spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        />

                        <h3
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            color: "#00D6FF",
                            fontSize: "16px",
                            fontWeight: 600,
                            letterSpacing: "0.5px",
                            margin: 0,
                          }}
                        >
                          <DecryptedText
                            text={LOADING_PHRASES[loadingPhraseIdx]}
                            trigger={true}
                            speed={20}
                          />
                        </h3>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.4)",
                            marginTop: "12px",
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          Intelligence active. Processing content structure...
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* SUCCESS SUMMARY STATE */}
                  {status === "success" && summaryData && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                      }}
                    >
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "32px",
                          padding: "40px",
                          boxShadow:
                            "0 24px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                          position: "relative",
                          overflow: "hidden",
                          backdropFilter: "blur(32px) saturate(150%)",
                          WebkitBackdropFilter: "blur(32px) saturate(150%)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "20px",
                          }}
                        >
                          <span
                            style={{
                              background: "rgba(0, 214, 255, 0.1)",
                              color: "#00D6FF",
                              border: "1px solid rgba(0, 214, 255, 0.2)",
                              padding: "4px 12px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: 600,
                              fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            {summaryData.vibe}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              fontFamily: "'Inter', sans-serif",
                              color: "rgba(255,255,255,0.4)",
                            }}
                          >
                            Analysis Complete · Added by{" "}
                            {tokenUsername || "Someone"}
                          </span>
                        </div>

                        <h2
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "24px",
                            fontWeight: 700,
                            letterSpacing: "-0.5px",
                            margin: "0 0 16px",
                            color: "rgba(255,255,255,0.95)",
                          }}
                        >
                          <DecryptedText
                            text={summaryData.title}
                            trigger={true}
                            speed={20}
                          />
                        </h2>

                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "15px",
                            fontWeight: 400,
                            lineHeight: 1.6,
                            color: "rgba(255,255,255,0.60)",
                            margin: 0,
                            paddingLeft: "16px",
                            borderLeft: "2px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <DecryptedText
                            text={summaryData.summary}
                            trigger={true}
                            speed={5}
                          />
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* LOWER SECTION: GRID OF LINKS */}
            <div
              style={{ width: "100%", marginTop: "clamp(80px, 16vh, 220px)" }}
            >
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  paddingBottom: "24px",
                  marginBottom: "40px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <h2
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "24px",
                      fontWeight: 600,
                      margin: 0,
                      color: "rgba(255,255,255,0.95)",
                      textShadow: "0 2px 10px rgba(0,0,0,0.35)",
                    }}
                  >
                    {activeProject
                      ? `Project: ${activeProject.title}`
                      : "Your Collection"}
                  </h2>
                  {activeProject && (
                    <button
                      onClick={() => setActiveProjectId(null)}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.85)",
                        borderRadius: "999px",
                        padding: "8px 14px",
                        fontSize: "12px",
                        fontFamily: "'Inter', sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      Back to all
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setIsCreateProjectModalOpen(true)}
                  disabled={!!activeProject}
                  title={
                    activeProject
                      ? "Go back to all to create another project"
                      : "Create project"
                  }
                  style={{
                    background: "rgba(0,214,255,0.1)",
                    border: "1px solid rgba(0,214,255,0.25)",
                    color: "#00D6FF",
                    borderRadius: "14px",
                    padding: "10px 16px",
                    fontSize: "13px",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    cursor: activeProject ? "not-allowed" : "pointer",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                    opacity: activeProject ? 0.45 : 1,
                  }}
                >
                  + Create Project
                </button>

                {/* Search Bar */}
                <div
                  style={{
                    position: "relative",
                    flex: 1,
                    minWidth: "250px",
                    maxWidth: "350px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search projects and cards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px 12px 40px",
                      borderRadius: "16px",
                      background: "rgba(255, 255, 255, 0.02)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      color: "rgba(255,255,255,0.92)",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "14px",
                      transition: "all 0.3s ease",
                      outline: "none",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                    onFocus={(e) => {
                      e.target.style.background = "rgba(255, 255, 255, 0.05)";
                      e.target.style.borderColor = "rgba(0, 214, 255, 0.3)";
                    }}
                    onBlur={(e) => {
                      e.target.style.background = "rgba(255, 255, 255, 0.02)";
                      e.target.style.borderColor = "rgba(255, 255, 255, 0.06)";
                    }}
                  />
                  <svg
                    style={{
                      position: "absolute",
                      left: 14,
                      top: 13,
                      width: 16,
                      height: 16,
                      fill: "none",
                      stroke: "rgba(255,255,255,0.4)",
                      strokeWidth: 2,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                    }}
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>

                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "14px",
                    fontFamily: "'Inter', sans-serif",
                    whiteSpace: "nowrap",
                    textShadow: "0 2px 10px rgba(0,0,0,0.35)",
                  }}
                >
                  {activeProject
                    ? `${visibleCards.length} / ${projectCardCount[activeProject._id] || 0} Cards`
                    : `${visibleProjects.length} Projects · ${visibleCards.length} Loose Cards`}
                </motion.span>
              </motion.div>

              <motion.div
                layout
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gridAutoRows: "1fr",
                  gap: "28px",
                }}
              >
                <AnimatePresence>
                  {!activeProject &&
                    visibleProjects.map((project, idx) => (
                      <motion.div
                        key={`project-${project._id}`}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                        style={{ height: "100%" }}
                      >
                        <ProjectCard
                          project={project}
                          index={idx}
                          cardCount={projectCardCount[project._id] || 0}
                          onOpen={() => setActiveProjectId(project._id)}
                          onRename={handleRenameProject}
                          onDelete={handleDeleteProject}
                        />
                      </motion.div>
                    ))}

                  {visibleCards.map((card, idx) => (
                    <motion.div
                      key={card._id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                      style={{ height: "100%" }}
                    >
                      <GridCard
                        card={card}
                        index={
                          !activeProject ? visibleProjects.length + idx : idx
                        }
                        onReact={sendReaction}
                        floatingEmojis={floatingEmojis}
                        onDelete={handleDelete}
                        onCardClick={setSelectedCard}
                        availableProjects={projects}
                        onMoveProject={handleMoveCardProject}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
