import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const VIBE_CFG = {
  "High-Signal": {
    bg: "linear-gradient(145deg,#0d1b3a,#173a75,#12244b)",
    pill: "#3B82F6",
    pillTxt: "#eaf2ff",
    border: "rgba(59,130,246,0.45)",
  },
  Educational: {
    bg: "linear-gradient(145deg,#0b2f28,#14614f,#0f4438)",
    pill: "#10B981",
    pillTxt: "#e8fff8",
    border: "rgba(16,185,129,0.45)",
  },
  Chaotic: {
    bg: "linear-gradient(145deg,#3a1a08,#7f340c,#4e2208)",
    pill: "#F97316",
    pillTxt: "#fff2e8",
    border: "rgba(249,115,22,0.45)",
  },
  Cursed: {
    bg: "linear-gradient(145deg,#2a3410,#4d6517,#3b4b14)",
    pill: "#A3E635",
    pillTxt: "#1f2a0f",
    border: "rgba(163,230,53,0.45)",
  },
  Wholesome: {
    bg: "linear-gradient(145deg,#3d1028,#7d1f50,#542037)",
    pill: "#F472B6",
    pillTxt: "#ffeaf5",
    border: "rgba(244,114,182,0.45)",
  },
  Insightful: {
    bg: "linear-gradient(145deg,#12173d,#2a3192,#1b2261)",
    pill: "#6366F1",
    pillTxt: "#eef0ff",
    border: "rgba(99,102,241,0.45)",
  },
  Controversial: {
    bg: "linear-gradient(145deg,#3d0d0d,#7a1717,#4d1212)",
    pill: "#EF4444",
    pillTxt: "#ffecec",
    border: "rgba(239,68,68,0.45)",
  },
  Funny: {
    bg: "linear-gradient(145deg,#3a2a08,#7c5b12,#5a400d)",
    pill: "#FBBF24",
    pillTxt: "#2e2206",
    border: "rgba(251,191,36,0.45)",
  },
};

export default function SummaryModal({ card, onClose }) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setShowContent(false);
  }, [card?._id]);

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

  const contextFeed = card.contextFeed || {};
  const contextStatus = contextFeed.status || "pending";
  const contextSummary =
    contextFeed.summary ||
    "Context Feed is waiting for the next grounded refresh.";
  const contextCheckedAt = contextFeed.checkedAt
    ? new Date(contextFeed.checkedAt)
    : null;
  const checkedLabel =
    contextCheckedAt && !Number.isNaN(contextCheckedAt.getTime())
      ? contextCheckedAt.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "Not checked yet";

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

          <div style={{ marginTop: 18 }}>
            <button
              onClick={() => setShowContent((prev) => !prev)}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                borderRadius: 12,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans',sans-serif",
                cursor: "pointer",
              }}
            >
              {showContent ? "Hide Content" : "Show Content"}
            </button>
          </div>

          {showContent && (
            <div
              style={{
                marginTop: 16,
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 14,
                background: "rgba(0,0,0,0.22)",
                padding: "14px 16px",
                maxHeight: "280px",
                overflowY: "auto",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.86)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {card.content || "No content available for this card."}
              </p>
            </div>
          )}

          <div
            style={{
              marginTop: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 14,
              background: "rgba(0,0,0,0.22)",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.65)",
                  fontWeight: 700,
                }}
              >
                Context Feed
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.62)",
                }}
              >
                Last check: {checkedLabel}
              </span>
            </div>

            <div
              style={{
                fontSize: 12,
                marginBottom: 10,
                display: "inline-flex",
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.88)",
                textTransform: "capitalize",
              }}
            >
              {contextStatus.replace(/-/g, " ")}
            </div>

            <p
              style={{
                margin: 0,
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.86)",
                whiteSpace: "pre-wrap",
              }}
            >
              {contextSummary}
            </p>

            {contextFeed.successorUrl && (
              <p
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                Suggested successor:{" "}
                <a
                  href={contextFeed.successorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#c4d6ff" }}
                >
                  {contextFeed.successorUrl}
                </a>
              </p>
            )}
          </div>

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
