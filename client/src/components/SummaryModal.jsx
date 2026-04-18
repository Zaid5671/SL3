import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const VIBE_CFG = {
  "High-Signal": {
    bg: "linear-gradient(145deg,#0a3d28,#1a6b4a,#0d4535)",
    pill: "#1D9E75",
    pillTxt: "#d0f5e8",
    border: "rgba(29, 158, 117, 0.4)",
  },
  Educational: {
    bg: "linear-gradient(145deg,#091f3d,#163a6b,#0c2d52)",
    pill: "#2275c4",
    pillTxt: "#c8e3fb",
    border: "rgba(34, 117, 196, 0.4)",
  },
  Chaotic: {
    bg: "linear-gradient(145deg,#3d0920,#7a1545,#4d0c2a)",
    pill: "#b83a68",
    pillTxt: "#fce8f0",
    border: "rgba(184, 58, 104, 0.4)",
  },
  Cursed: {
    bg: "linear-gradient(145deg,#2a1600,#5a3008,#3d2005)",
    pill: "#c47f1a",
    pillTxt: "#fef0d0",
    border: "rgba(196, 127, 26, 0.4)",
  },
};

export default function SummaryModal({ card, onClose }) {
  if (!card) return null;

  const v =
    VIBE_CFG[card.vibe] ||
    (() => {
      const label = String(card.vibe || "General");
      let hash = 0;
      for (let index = 0; index < label.length; index++) {
        hash = label.charCodeAt(index) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash) % 360;
      return {
        bg: `linear-gradient(145deg, hsl(${hue},70%,18%), hsl(${hue},65%,26%), hsl(${hue},72%,20%))`,
        pill: `hsl(${hue},72%,55%)`,
        pillTxt: `hsl(${hue},95%,10%)`,
        border: `hsla(${hue},72%,55%,0.35)`,
      };
    })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            width: "90%",
            maxWidth: "800px",
            maxHeight: "90vh",
            overflowY: "auto",
            background: v.bg,
            border: `1px solid ${v.border}`,
            borderRadius: "24px",
            padding: "40px",
            boxShadow: `0 20px 40px ${v.border}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontFamily: "'Syne',sans-serif",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.06em",
                padding: "6px 16px",
                borderRadius: 999,
                background: v.pill,
                color: v.pillTxt,
              }}
            >
              {card.icon} &nbsp; {card.vibe}
            </span>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                width: 36,
                height: 36,
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: 18,
              }}
            >
              &times;
            </button>
          </div>

          <h2
            style={{
              fontFamily: "'Syne',sans-serif",
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1.2,
              margin: "24px 0",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {card.title}
          </h2>

          <p
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 16,
              fontWeight: 400,
              lineHeight: 1.7,
              margin: 0,
              color: "rgba(255,255,255,0.8)",
              whiteSpace: "pre-wrap",
            }}
          >
            {card.summary}
          </p>

          <div
            style={{
              marginTop: 32,
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              🔗{" "}
              <a
                href={card.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit" }}
              >
                {card.source}
              </a>
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              Decay: {card.decay}%
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
