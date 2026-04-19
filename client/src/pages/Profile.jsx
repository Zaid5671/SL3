import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import FloatingOrbs from "../components/FloatingOrbs";

const formatDate = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const TAG_GRADIENT_PRESETS = [
  {
    primary: "rgba(59,130,246,0.26)",
    secondary: "rgba(16,185,129,0.2)",
    tertiary: "rgba(99,102,241,0.18)",
    accentBg: "rgba(59,130,246,0.18)",
    accentBorder: "rgba(59,130,246,0.35)",
    accentText: "#bfdbfe",
  },
  {
    primary: "rgba(236,72,153,0.26)",
    secondary: "rgba(251,146,60,0.2)",
    tertiary: "rgba(244,63,94,0.18)",
    accentBg: "rgba(236,72,153,0.2)",
    accentBorder: "rgba(236,72,153,0.38)",
    accentText: "#fbcfe8",
  },
  {
    primary: "rgba(34,197,94,0.24)",
    secondary: "rgba(14,165,233,0.2)",
    tertiary: "rgba(132,204,22,0.16)",
    accentBg: "rgba(34,197,94,0.2)",
    accentBorder: "rgba(34,197,94,0.38)",
    accentText: "#bbf7d0",
  },
  {
    primary: "rgba(251,191,36,0.24)",
    secondary: "rgba(239,68,68,0.2)",
    tertiary: "rgba(249,115,22,0.18)",
    accentBg: "rgba(251,191,36,0.2)",
    accentBorder: "rgba(251,191,36,0.38)",
    accentText: "#fde68a",
  },
  {
    primary: "rgba(168,85,247,0.26)",
    secondary: "rgba(59,130,246,0.2)",
    tertiary: "rgba(14,165,233,0.16)",
    accentBg: "rgba(168,85,247,0.2)",
    accentBorder: "rgba(168,85,247,0.38)",
    accentText: "#e9d5ff",
  },
];

const getTagHash = (value = "") => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getThemeFromTag = (tag) => {
  if (!tag) {
    const base = TAG_GRADIENT_PRESETS[0];
    return {
      ...base,
      pageBg: `radial-gradient(circle at 12% 14%, ${base.primary}, transparent 40%), radial-gradient(circle at 88% 82%, ${base.secondary}, transparent 42%), radial-gradient(circle at 50% 100%, ${base.tertiary}, transparent 50%), #070b12`,
    };
  }

  const palette =
    TAG_GRADIENT_PRESETS[getTagHash(tag) % TAG_GRADIENT_PRESETS.length];
  return {
    ...palette,
    pageBg: `radial-gradient(circle at 14% 16%, ${palette.primary}, transparent 38%), radial-gradient(circle at 86% 80%, ${palette.secondary}, transparent 44%), radial-gradient(circle at 50% 96%, ${palette.tertiary}, transparent 52%), #070b12`,
  };
};

export default function Profile() {
  const token = useMemo(() => localStorage.getItem("token"), []);
  const hasToken = Boolean(token);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(hasToken);
  const [error, setError] = useState(hasToken ? "" : "No active session");
  const [panelHover, setPanelHover] = useState(false);
  const [cursorFX, setCursorFX] = useState({ x: 50, y: 50, rx: 0, ry: 0 });
  const panelRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(
          "http://localhost:5000/api/users/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        setProfile(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (!hasToken) return;
    fetchProfile();
  }, [token, hasToken]);

  const user = profile?.user;
  const stats = profile?.stats;
  const userHasPostedUrls = Number(stats?.totalUrlsPosted || 0) > 0;
  const userTag = userHasPostedUrls ? user?.profileTag : null;
  const theme = useMemo(() => getThemeFromTag(userTag), [userTag]);

  const handlePanelMouseMove = (event) => {
    if (!panelRef.current) return;

    const rect = panelRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * 100;
    const py = ((event.clientY - rect.top) / rect.height) * 100;

    const x = Math.max(0, Math.min(100, px));
    const y = Math.max(0, Math.min(100, py));

    const normalizedX = (x - 50) / 50;
    const normalizedY = (y - 50) / 50;

    setCursorFX({
      x,
      y,
      rx: -normalizedY * 3.2,
      ry: normalizedX * 4.2,
    });
  };

  const handlePanelMouseLeave = () => {
    setPanelHover(false);
    setCursorFX({ x: 50, y: 50, rx: 0, ry: 0 });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.pageBg,
        color: "#fff",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @keyframes liquidFloatA {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(24px, -12px, 0) scale(1.08); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }

        @keyframes liquidFloatB {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-20px, 14px, 0) scale(1.06); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }

        @keyframes liquidSweep {
          0% { transform: translateX(-120%) skewX(-14deg); opacity: 0; }
          30% { opacity: 0.45; }
          65% { opacity: 0.2; }
          100% { transform: translateX(120%) skewX(-14deg); opacity: 0; }
        }
      `}</style>
      <FloatingOrbs count={7} />
      <Navbar />

      <main
        style={{
          position: "relative",
          zIndex: 2,
          width: "min(960px, 92vw)",
          margin: "0 auto",
          paddingTop: "clamp(120px, 16vh, 180px)",
          paddingBottom: "80px",
        }}
      >
        <section
          ref={panelRef}
          onMouseEnter={() => setPanelHover(true)}
          onMouseMove={handlePanelMouseMove}
          onMouseLeave={handlePanelMouseLeave}
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "28px",
            border: `1px solid ${theme.accentBorder}`,
            background: `linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.07) 42%, rgba(255,255,255,0.03) 100%)`,
            backdropFilter: "blur(36px) saturate(185%)",
            WebkitBackdropFilter: "blur(36px) saturate(185%)",
            boxShadow: panelHover
              ? "0 36px 90px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -1px 0 rgba(255,255,255,0.1)"
              : "0 30px 70px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(255,255,255,0.08)",
            padding: "clamp(20px, 3vw, 34px)",
            transform: `perspective(1200px) rotateX(${cursorFX.rx}deg) rotateY(${cursorFX.ry}deg)`,
            transformStyle: "preserve-3d",
            transition: panelHover
              ? "box-shadow 180ms ease, border-color 180ms ease"
              : "transform 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1), border-color 280ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(130deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 34%, rgba(255,255,255,0.03) 58%, rgba(255,255,255,0.02) 100%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          <div
            style={{
              position: "absolute",
              width: 320,
              height: 320,
              left: -110,
              top: -150,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${theme.primary} 0%, rgba(255,255,255,0) 68%)`,
              filter: "blur(16px)",
              opacity: 0.75,
              pointerEvents: "none",
              zIndex: 0,
              animation: "liquidFloatA 13s ease-in-out infinite",
            }}
          />

          <div
            style={{
              position: "absolute",
              width: 260,
              height: 260,
              right: -80,
              bottom: -120,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${theme.secondary} 0%, rgba(255,255,255,0) 70%)`,
              filter: "blur(18px)",
              opacity: 0.72,
              pointerEvents: "none",
              zIndex: 0,
              animation: "liquidFloatB 11s ease-in-out infinite",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "45%",
              height: "100%",
              background:
                "linear-gradient(95deg, rgba(255,255,255,0.34), rgba(255,255,255,0.08), rgba(255,255,255,0))",
              pointerEvents: "none",
              zIndex: 1,
              animation: "liquidSweep 8.5s ease-in-out infinite",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 1,
              opacity: panelHover ? 1 : 0,
              transition: "opacity 220ms ease",
              background: `linear-gradient(115deg,
                rgba(255,255,255,0) ${Math.max(0, cursorFX.x - 18)}%,
                rgba(255,255,255,0.08) ${Math.max(0, cursorFX.x - 6)}%,
                rgba(255,255,255,0.18) ${cursorFX.x}%,
                rgba(255,255,255,0.08) ${Math.min(100, cursorFX.x + 6)}%,
                rgba(255,255,255,0) ${Math.min(100, cursorFX.x + 18)}%)`,
              mixBlendMode: "screen",
            }}
          />

          <div style={{ position: "relative", zIndex: 2 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: "clamp(28px, 4vw, 42px)",
                letterSpacing: "-0.02em",
              }}
            >
              Your Profile
            </h1>

            <p
              style={{
                marginTop: 10,
                marginBottom: 22,
                color: "rgba(255,255,255,0.72)",
                fontFamily: "'Inter', sans-serif",
                fontSize: 15,
              }}
            >
              Your account details and your AI-generated interest tag.
            </p>

            {loading && (
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                Loading profile...
              </p>
            )}

            {!loading && error && (
              <p
                style={{ fontFamily: "'Inter', sans-serif", color: "#fca5a5" }}
              >
                {error}
              </p>
            )}

            {!loading && !error && user && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 14,
                  }}
                >
                  <InfoCard label="Username" value={user.username} />
                  <InfoCard label="Email" value={user.email} />
                  <InfoCard label="Joined" value={formatDate(user.createdAt)} />
                  <InfoCard
                    label="Tag"
                    value={
                      userTag ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 12px",
                            borderRadius: 999,
                            background: theme.accentBg,
                            border: `1px solid ${theme.accentBorder}`,
                            color: theme.accentText,
                            fontWeight: 600,
                          }}
                        >
                          {userTag}
                        </span>
                      ) : (
                        "No tag yet"
                      )
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 18,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  <StatCard
                    title="Total URLs"
                    value={String(stats?.totalUrlsPosted || 0)}
                  />
                  <StatCard
                    title="Active URLs"
                    value={String(stats?.activeUrls || 0)}
                  />
                  <StatCard
                    title="Archived URLs"
                    value={String(stats?.archivedUrls || 0)}
                  />
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.52)",
          fontFamily: "'Inter', sans-serif",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.95)",
          fontFamily: "'Inter', sans-serif",
          fontSize: 16,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          color: "rgba(255,255,255,0.64)",
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}
