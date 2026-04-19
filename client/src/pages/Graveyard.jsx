import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import axios from "axios";
import Navbar from "../components/Navbar";
import ScrollAnimationCanvas from "../components/ScrollAnimationCanvas";
import FloatingOrbs from "../components/FloatingOrbs";

const getCreatedDaysAgo = (createdAt) => {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return "Unknown";

  const dayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.max(0, Math.floor((Date.now() - createdTime) / dayMs));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
};

// ─── CARD COMPONENT ──────────────────────────────────────────────────────────
function GraveyardCard({ card, index, onRestore, onDelete }) {
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
        boxShadow: `0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)`,
      }}
      style={{
        width: "100%",
        height: "100%",
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "rgba(238, 245, 255, 0.2)",
        backdropFilter: "blur(32px) saturate(120%)",
        WebkitBackdropFilter: "blur(32px) saturate(120%)",
        border: `1px solid rgba(255, 255, 255, 0.38)`,
        borderRadius: "32px",
        padding: "32px",
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        boxShadow:
          "0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.24)",
        transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
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
            background: "rgba(124, 58, 237, 0.14)",
            color: "#F5EFFE",
            border: "1px solid rgba(124, 58, 237, 0.28)",
          }}
        >
          {card.icon} &nbsp; Archived
        </span>
        <span
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.78)",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {getCreatedDaysAgo(card.createdAt)}
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
          color: "rgba(255,255,255,0.98)",
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
          WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical",
          color: "rgba(255,255,255,0.88)",
        }}
      >
        {card.summary}
      </p>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.22)",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontFamily: "'Inter', sans-serif",
            color: "rgba(255,255,255,0.85)",
            flex: 1,
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          🔗 {card.source}
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRestore(card._id);
          }}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.8)",
            borderRadius: "14px",
            padding: "12px",
            fontSize: "13px",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
          onMouseOver={(e) => {
            e.target.style.background = "rgba(124, 58, 237, 0.1)";
            e.target.style.borderColor = "rgba(124, 58, 237, 0.2)";
            e.target.style.color = "#fff";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "rgba(255,255,255,0.03)";
            e.target.style.borderColor = "rgba(255,255,255,0.08)";
            e.target.style.color = "rgba(255,255,255,0.8)";
          }}
        >
          Restore
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (
              window.confirm(
                "Permanently delete this item? This cannot be undone.",
              )
            ) {
              onDelete(card._id);
            }
          }}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            color: "rgba(239, 68, 68, 0.7)",
            borderRadius: "14px",
            padding: "12px",
            fontSize: "13px",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseOver={(e) => {
            e.target.style.background = "rgba(239, 68, 68, 0.1)";
            e.target.style.borderColor = "rgba(239, 68, 68, 0.2)";
            e.target.style.color = "#FF6B6B";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "rgba(255,255,255,0.02)";
            e.target.style.borderColor = "rgba(255,255,255,0.05)";
            e.target.style.color = "rgba(239, 68, 68, 0.7)";
          }}
        >
          Delete
        </button>
      </div>
    </motion.div>
  );
}

// ─── GRAVEYARD PAGE ──────────────────────────────────────────────────────────
export default function Graveyard() {
  const [cards, setCards] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get("/api/links?archived=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCards(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching links:", error);
        setCards([]);
      }
    };
    fetchLinks();
  }, []);

  const handleRestore = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/links/${id}/restore`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCards(cards.filter((c) => c._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/links/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCards(cards.filter((c) => c._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
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
        
        .floating-particles {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(0, 214, 255, 0.08) 0%, transparent 50%),
            linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.35) 100%);
          pointer-events: none;
          z-index: 1;
        }
      `}</style>

      <Navbar />

      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", minHeight: "400vh" }}
      >
        {/* Sticky Canvas Container with purple/dark filter */}
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
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              filter:
                "hue-rotate(-20deg) saturate(1.15) brightness(0.75) contrast(1.1)",
            }}
          >
            <ScrollAnimationCanvas
              scrollYProgress={scrollYProgress}
              frameCount={240}
              imagePath="/2nnd/ezgif-frame-"
            />
          </div>
          <FloatingOrbs />
          <div className="floating-particles" />
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
              paddingTop: "120px",
              paddingInline: "32px",
              paddingBottom: "100px",
              maxWidth: "1200px",
              width: "100%",
              margin: "0 auto",
            }}
          >
            {/* HERO SECTION */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: "100%", maxWidth: "800px", marginBottom: "80px" }}
            >
              <div style={{ textAlign: "center", marginBottom: "40px" }}>
                <h1
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "64px",
                    fontWeight: 800,
                    letterSpacing: "-2px",
                    margin: "0 0 16px",
                    color: "#ffffff",
                    lineHeight: 1.1,
                    textShadow:
                      "0 4px 30px rgba(0,0,0,0.6), 0 2px 10px rgba(124, 58, 237, 0.4)",
                  }}
                >
                  Welcome to the Graveyard
                </h1>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "18px",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.85)",
                    margin: 0,
                    textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                  }}
                >
                  Expired products. Retired inventory. Archived automatically.
                </p>
              </div>
            </motion.div>

            {/* LOWER SECTION: GRID OF LINKS */}
            <div style={{ width: "100%", marginTop: "60vh" }}>
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
                  Buried Items
                </h2>

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
                    placeholder="Search archive..."
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
                      e.target.style.borderColor = "rgba(124, 58, 237, 0.3)";
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
                  {
                    cards.filter(
                      (card) =>
                        card.title
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        card.source
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase()),
                    ).length
                  }{" "}
                  Items
                </motion.span>
              </motion.div>

              {cards.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "100px 20px",
                    color: "rgba(255,255,255,0.3)",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <div
                    style={{
                      fontSize: "48px",
                      marginBottom: "24px",
                      opacity: 0.5,
                    }}
                  >
                    🗄️
                  </div>
                  Archive is empty.
                </div>
              ) : (
                <motion.div
                  layout
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(300px, 1fr))",
                    gridAutoRows: "1fr",
                    gap: "28px",
                  }}
                >
                  <AnimatePresence>
                    {cards
                      .filter(
                        (card) =>
                          card.title
                            ?.toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          card.source
                            ?.toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                      )
                      .map((card, idx) => (
                        <motion.div
                          key={card._id}
                          layout
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{
                            opacity: 0,
                            scale: 0.95,
                            filter: "blur(8px)",
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                          style={{ height: "100%" }}
                        >
                          <GraveyardCard
                            card={card}
                            index={idx}
                            onRestore={handleRestore}
                            onDelete={handleDelete}
                          />
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
