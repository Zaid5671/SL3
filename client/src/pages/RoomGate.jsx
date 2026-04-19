import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import FloatingOrbs from "../components/FloatingOrbs";

// ─── ROOM ID DISPLAY ──────────────────────────────────────────────────────────
function RoomIdDisplay({ roomId }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: "rgba(0, 214, 255, 0.03)",
        border: "1px solid rgba(0, 214, 255, 0.15)",
        borderRadius: "24px",
        padding: "32px",
        textAlign: "center",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.5)",
          margin: "0 0 12px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Your Room ID
      </p>

      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "48px",
          fontWeight: 800,
          letterSpacing: "0.15em",
          color: "#00D6FF",
          textShadow: "0 0 40px rgba(0, 214, 255, 0.5)",
          marginBottom: "20px",
        }}
      >
        {roomId}
      </div>

      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "14px",
          color: "rgba(255,255,255,0.4)",
          margin: "0 0 24px",
        }}
      >
        Share this ID + your password with your team
      </p>

      <button
        onClick={copy}
        style={{
          background: copied
            ? "rgba(16, 185, 129, 0.1)"
            : "rgba(0, 214, 255, 0.08)",
          border: `1px solid ${copied ? "rgba(16, 185, 129, 0.3)" : "rgba(0, 214, 255, 0.2)"}`,
          color: copied ? "#10B981" : "#00D6FF",
          padding: "12px 32px",
          borderRadius: "999px",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          fontSize: "14px",
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onMouseOver={(e) => {
          if (!copied) {
            e.target.style.background = "rgba(0, 214, 255, 0.15)";
            e.target.style.boxShadow = "0 8px 24px rgba(0, 214, 255, 0.2)";
          }
        }}
        onMouseOut={(e) => {
          if (!copied) {
            e.target.style.background = "rgba(0, 214, 255, 0.08)";
            e.target.style.boxShadow = "none";
          }
        }}
      >
        {copied ? "✓ Copied!" : "Copy Room ID"}
      </button>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function RoomGate() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("join"); // "join" | "create" | "remix"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null); // { roomId, name }

  // Create form
  const [createName, setCreateName] = useState("");
  const [createPass, setCreatePass] = useState("");
  const [createPublic, setCreatePublic] = useState(false);

  // Join form
  const [joinId, setJoinId] = useState("");
  const [joinPass, setJoinPass] = useState("");

  // Remix form
  const [publicRooms, setPublicRooms] = useState([]);
  const [selectedPublicRoomId, setSelectedPublicRoomId] = useState("");
  const [forkName, setForkName] = useState("");
  const [forkPass, setForkPass] = useState("");
  const [forkPublic, setForkPublic] = useState(false);
  const [lineageData, setLineageData] = useState(null);
  const [loadingPublicRooms, setLoadingPublicRooms] = useState(false);

  const token = localStorage.getItem("token");

  const fetchPublicRooms = async () => {
    setLoadingPublicRooms(true);
    try {
      const { data } = await axios.get("/api/rooms/public", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPublicRooms(data || []);
      if (data?.length) {
        setSelectedPublicRoomId((prev) => prev || data[0].roomId);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load public shelves");
    } finally {
      setLoadingPublicRooms(false);
    }
  };

  const fetchLineage = async (roomId) => {
    if (!roomId) return;

    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`/api/rooms/${roomId}/lineage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLineageData(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load lineage tree");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "remix") {
      fetchPublicRooms();
    }
  }, [tab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(
        "/api/rooms/create",
        { name: createName, password: createPass, isPublic: createPublic },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCreatedRoom(data);
      setCreatePublic(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(
        "/api/rooms/join",
        { roomId: joinId, password: joinPass },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      sessionStorage.setItem("shelfRoomId", data.roomId);
      sessionStorage.setItem("shelfRoomName", data.name);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  const handleFork = async (e) => {
    e.preventDefault();
    if (!selectedPublicRoomId) {
      setError("Select a public shelf first");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(
        `/api/rooms/${selectedPublicRoomId}/fork`,
        {
          name: forkName,
          password: forkPass,
          isPublic: forkPublic,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setCreatedRoom({ roomId: data.roomId, name: data.name });
      setLineageData(null);
      setForkName("");
      setForkPass("");
      setForkPublic(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fork shelf");
    } finally {
      setLoading(false);
    }
  };

  const enterCreatedRoom = () => {
    sessionStorage.setItem("shelfRoomId", createdRoom.roomId);
    sessionStorage.setItem("shelfRoomName", createdRoom.name);
    navigate("/");
  };

  // ── Input style helper ─────────────────────────────────────────────────────
  const inputStyle = {
    width: "100%",
    padding: "16px 20px",
    borderRadius: "16px",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    color: "#f0f2f5",
    fontFamily: "'Inter', sans-serif",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
  };

  const btnStyle = {
    width: "100%",
    padding: "16px",
    background: "rgba(0, 214, 255, 0.1)",
    border: "1px solid rgba(0, 214, 255, 0.2)",
    borderRadius: "16px",
    color: "#00D6FF",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: "16px",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    marginTop: "12px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
  };

  return (
    <>
      <style>{`
        body { 
          margin: 0; 
          background: #000000; 
          color: rgba(255,255,255,0.92); 
          font-family: 'Inter', sans-serif; 
          min-height: 100vh; 
          overflow-x: hidden; 
        }
        * { box-sizing: border-box; }
        
        .floating-particles {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(0, 214, 255, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(124, 58, 237, 0.06) 0%, transparent 50%),
            linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.35) 100%);
          pointer-events: none;
          z-index: 0;
        }

        input:focus { 
          background: rgba(255, 255, 255, 0.05) !important; 
          border-color: rgba(0, 214, 255, 0.4) !important; 
          box-shadow: 0 0 20px rgba(0, 214, 255, 0.15), inset 0 1px 0 rgba(255,255,255,0.05) !important; 
        }
        input::placeholder { color: rgba(255, 255, 255, 0.3); }
        
        @keyframes subtle-float { 
          0%, 100% { transform: translateY(0px); } 
          50% { transform: translateY(-8px); } 
        }
      `}</style>

      {/* Premium Navbar */}
      <Navbar />

      {/* Cinematic Background */}
      <div className="floating-particles" />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.7,
        }}
      >
        <FloatingOrbs />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 20px 40px", // accommodate sticky navbar
        }}
      >
        {/* Content Container */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: "100%",
            maxWidth: "480px",
            background: "rgba(255, 255, 255, 0.01)",
            backdropFilter: "blur(40px) saturate(120%)",
            WebkitBackdropFilter: "blur(40px) saturate(120%)",
            border: "1px solid rgba(0, 214, 255, 0.1)",
            borderRadius: "32px",
            padding: "48px",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
            animation: "subtle-float 6s ease-in-out infinite",
          }}
        >
          {createdRoom ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "16px",
                    background: "rgba(16, 185, 129, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>🎉</span>
                </div>
              </div>
              <h2
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: "28px",
                  margin: "0 0 12px",
                  color: "#ffffff",
                  textAlign: "center",
                  letterSpacing: "-0.5px",
                }}
              >
                Room Created!
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.5)",
                  margin: "0 0 32px",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Share the Room ID and your password with your teammates to
                collaborate.
              </p>
              <RoomIdDisplay roomId={createdRoom.roomId} />
              <button
                onClick={enterCreatedRoom}
                style={{
                  ...btnStyle,
                  marginTop: "32px",
                  background: "rgba(16, 185, 129, 0.1)",
                  borderColor: "rgba(16, 185, 129, 0.2)",
                  color: "#10B981",
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "rgba(16, 185, 129, 0.15)";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "rgba(16, 185, 129, 0.1)";
                }}
              >
                Enter the Shelf →
              </button>
            </motion.div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background: "rgba(0, 214, 255, 0.05)",
                    border: "1px solid rgba(0, 214, 255, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    color: "#00D6FF",
                    margin: "0 auto 20px",
                    boxShadow: "0 8px 32px rgba(0, 214, 255, 0.1)",
                  }}
                >
                  🤝
                </div>
                <h2
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: "28px",
                    margin: "0 0 8px",
                    color: "#ffffff",
                    letterSpacing: "-0.5px",
                  }}
                >
                  Enter your Shelf
                </h2>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "15px",
                    color: "rgba(255,255,255,0.5)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Create a new shared space or join one with a Room ID.
                </p>
              </div>

              {/* Liquid Tabs */}
              <div
                style={{
                  display: "flex",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "16px",
                  padding: "6px",
                  marginBottom: "32px",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                {["join", "create", "remix"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTab(t);
                      setError("");
                    }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      border: "none",
                      background:
                        tab === t ? "rgba(255,255,255,0.06)" : "transparent",
                      color: tab === t ? "#ffffff" : "rgba(255,255,255,0.4)",
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                      boxShadow:
                        tab === t
                          ? "inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.2)"
                          : "none",
                    }}
                  >
                    {t === "join"
                      ? "🚪 Join Room"
                      : t === "create"
                        ? "✨ Create Room"
                        : "🌿 Remix Shelf"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* ── JOIN FORM ── */}
                {tab === "join" && (
                  <motion.form
                    key="join"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleJoin}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.5)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: "8px",
                        }}
                      >
                        Room ID
                      </label>
                      <input
                        style={{
                          ...inputStyle,
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 700,
                          fontSize: "20px",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          textAlign: "center",
                          color: "#00D6FF",
                        }}
                        placeholder="A3F9B2"
                        value={joinId}
                        onChange={(e) =>
                          setJoinId(e.target.value.toUpperCase())
                        }
                        maxLength={6}
                        required
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.5)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: "8px",
                        }}
                      >
                        Password
                      </label>
                      <input
                        style={inputStyle}
                        type="password"
                        placeholder="Enter room password"
                        value={joinPass}
                        onChange={(e) => setJoinPass(e.target.value)}
                        required
                      />
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          color: "#ef4444",
                          margin: 0,
                          padding: "12px 16px",
                          background: "rgba(239, 68, 68, 0.08)",
                          borderRadius: "12px",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                        }}
                      >
                        {error}
                      </motion.p>
                    )}
                    <button
                      type="submit"
                      style={btnStyle}
                      disabled={loading}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background =
                          "rgba(0, 214, 255, 0.15)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 24px rgba(0, 214, 255, 0.2)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background =
                          "rgba(0, 214, 255, 0.1)";
                        e.currentTarget.style.boxShadow =
                          "inset 0 1px 0 rgba(255,255,255,0.05)";
                      }}
                    >
                      {loading ? "Joining..." : "Join Room →"}
                    </button>
                  </motion.form>
                )}

                {/* ── CREATE FORM ── */}
                {tab === "create" && (
                  <motion.form
                    key="create"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleCreate}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.5)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: "8px",
                        }}
                      >
                        Shelf Name (optional)
                      </label>
                      <input
                        style={inputStyle}
                        placeholder="e.g. Project Apollo"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.5)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: "8px",
                        }}
                      >
                        Room Password
                      </label>
                      <input
                        style={inputStyle}
                        type="password"
                        placeholder="Choose a team password"
                        value={createPass}
                        onChange={(e) => setCreatePass(e.target.value)}
                        required
                      />
                    </div>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        color: "rgba(255,255,255,0.75)",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={createPublic}
                        onChange={(e) => setCreatePublic(e.target.checked)}
                      />
                      Make this shelf public for remixing
                    </label>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          color: "#ef4444",
                          margin: 0,
                          padding: "12px 16px",
                          background: "rgba(239, 68, 68, 0.08)",
                          borderRadius: "12px",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                        }}
                      >
                        {error}
                      </motion.p>
                    )}
                    <button
                      type="submit"
                      style={{
                        ...btnStyle,
                        background: "rgba(124, 58, 237, 0.1)",
                        borderColor: "rgba(124, 58, 237, 0.2)",
                        color: "#c084fc",
                      }}
                      disabled={loading}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background =
                          "rgba(124, 58, 237, 0.15)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 24px rgba(124, 58, 237, 0.2)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background =
                          "rgba(124, 58, 237, 0.1)";
                        e.currentTarget.style.boxShadow =
                          "inset 0 1px 0 rgba(255,255,255,0.05)";
                      }}
                    >
                      {loading ? "Creating..." : "Create Room →"}
                    </button>
                  </motion.form>
                )}

                {/* ── REMIX FORM ── */}
                {tab === "remix" && (
                  <motion.form
                    key="remix"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleFork}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.5)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: "8px",
                        }}
                      >
                        Public Shelf
                      </label>
                      <select
                        style={{ ...inputStyle, color: "#e5f7ff" }}
                        value={selectedPublicRoomId}
                        onChange={(e) => {
                          setSelectedPublicRoomId(e.target.value);
                          setLineageData(null);
                        }}
                        disabled={loadingPublicRooms}
                      >
                        {!publicRooms.length && (
                          <option value="">No public shelves available</option>
                        )}
                        {publicRooms.map((room) => (
                          <option key={room.roomId} value={room.roomId}>
                            {room.name} ({room.roomId}) · by{" "}
                            {room.createdBy?.username || "Unknown"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedPublicRoomId || loading}
                      onClick={() => fetchLineage(selectedPublicRoomId)}
                      style={{
                        ...btnStyle,
                        marginTop: 0,
                        background: "rgba(59, 130, 246, 0.1)",
                        borderColor: "rgba(59, 130, 246, 0.22)",
                        color: "#93c5fd",
                      }}
                    >
                      {loading ? "Loading..." : "View Lineage"}
                    </button>

                    {lineageData && (
                      <div
                        style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "14px",
                          background: "rgba(255,255,255,0.02)",
                          padding: "12px 14px",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: "rgba(255,255,255,0.56)",
                            marginBottom: 6,
                          }}
                        >
                          LINEAGE TREE SNAPSHOT
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: "rgba(255,255,255,0.88)",
                            marginBottom: 4,
                          }}
                        >
                          Original curator:{" "}
                          <strong>{lineageData.originalCurator}</strong>
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: "rgba(255,255,255,0.88)",
                          }}
                        >
                          Total remixes:{" "}
                          <strong>{lineageData.totalRemixes}</strong>
                        </div>
                      </div>
                    )}

                    <div>
                      <label
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.5)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: "8px",
                        }}
                      >
                        New Shelf Name (optional)
                      </label>
                      <input
                        style={inputStyle}
                        placeholder="e.g. Middle East Briefing Remix"
                        value={forkName}
                        onChange={(e) => setForkName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.5)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: "8px",
                        }}
                      >
                        New Shelf Password
                      </label>
                      <input
                        style={inputStyle}
                        type="password"
                        placeholder="Choose password for your fork"
                        value={forkPass}
                        onChange={(e) => setForkPass(e.target.value)}
                        required
                      />
                    </div>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        color: "rgba(255,255,255,0.75)",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={forkPublic}
                        onChange={(e) => setForkPublic(e.target.checked)}
                      />
                      Make this fork public for others to remix
                    </label>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          color: "#ef4444",
                          margin: 0,
                          padding: "12px 16px",
                          background: "rgba(239, 68, 68, 0.08)",
                          borderRadius: "12px",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                        }}
                      >
                        {error}
                      </motion.p>
                    )}

                    <button
                      type="submit"
                      style={{
                        ...btnStyle,
                        background: "rgba(16, 185, 129, 0.1)",
                        borderColor: "rgba(16, 185, 129, 0.2)",
                        color: "#6ee7b7",
                      }}
                      disabled={
                        loading || loadingPublicRooms || !publicRooms.length
                      }
                    >
                      {loading ? "Forking..." : "Fork Public Shelf →"}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Skip option */}
              <div style={{ textAlign: "center", marginTop: "32px" }}>
                <button
                  onClick={() => {
                    const token = localStorage.getItem("token");
                    if (token) {
                      const payload = JSON.parse(atob(token.split(".")[1]));
                      const personalRoomId = "PERSONAL_" + payload.user.id;
                      sessionStorage.setItem("shelfRoomId", personalRoomId);
                    }
                    sessionStorage.setItem(
                      "shelfRoomName",
                      "My Personal Shelf",
                    );
                    navigate("/");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.3)",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "color 0.3s ease",
                  }}
                  onMouseOver={(e) =>
                    (e.target.style.color = "rgba(255,255,255,0.7)")
                  }
                  onMouseOut={(e) =>
                    (e.target.style.color = "rgba(255,255,255,0.3)")
                  }
                >
                  Skip — use personal shelf
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}
