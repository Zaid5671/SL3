import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  let activeNav = "dashboard";
  if (location.pathname === "/graveyard") activeNav = "graveyard";
  if (location.pathname === "/room") activeNav = "room";

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊", path: "/" },
    { id: "room", label: "Rooms", icon: "🤝", path: "/room" },
    { id: "graveyard", label: "Graveyard", icon: "🪦", path: "/graveyard" },
  ];

  let themeColor = "#00D6FF"; // Default Cyan
  if (activeNav === "graveyard") themeColor = "#7C3AED"; // Purple
  if (activeNav === "room") themeColor = "#FF3B30"; // Premium Red Glowing Mark

  return (
    <nav
      style={{
        position: "fixed",
        top: scrolled ? 24 : 0,
        left: scrolled ? "50%" : 0,
        transform: scrolled ? "translateX(-50%)" : "none",
        width: scrolled ? "calc(100% - 48px)" : "100%",
        maxWidth: scrolled ? "1200px" : "100%",
        zIndex: 1000,
        height: 72,
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: scrolled ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.00)",
        backdropFilter: scrolled ? "blur(32px) saturate(150%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(32px) saturate(150%)" : "none",
        borderRadius: scrolled ? "36px" : "0px",
        border: scrolled ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid transparent",
        borderBottom: !scrolled ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: scrolled ? "0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
        transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Logo */}
      <div
        onClick={() => navigate("/")}
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
        onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <img 
          src="/brand-logo-v2.png" 
          alt="ShelfLife Logo" 
          style={{ 
            height: "44px", 
            width: "auto", 
            objectFit: "contain",
            filter: "drop-shadow(0 2px 12px rgba(255,255,255,0.15))"
          }} 
        />
      </div>

      {/* Navigation Items */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "36px",
          flex: 1,
          marginLeft: "60px",
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              background: "none",
              border: "none",
              color: activeNav === item.id
                ? "rgba(255,255,255,0.92)"
                : "rgba(255,255,255,0.50)",
              fontFamily: "'Inter', sans-serif",
              fontWeight: activeNav === item.id ? 600 : 400,
              fontSize: "15px",
              cursor: "pointer",
              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingBottom: "4px",
              position: "relative",
            }}
            onMouseOver={(e) => {
              if (activeNav !== item.id) e.currentTarget.style.color = "rgba(255,255,255,0.8)";
            }}
            onMouseOut={(e) => {
              if (activeNav !== item.id) e.currentTarget.style.color = "rgba(255,255,255,0.50)";
            }}
          >
            <span>{item.icon}</span>
            {item.label}
            {/* Active underline indicator */}
            {activeNav === item.id && (
              <div style={{
                position: "absolute",
                bottom: -2,
                left: 0,
                right: 0,
                height: 2,
                background: themeColor,
                borderRadius: 2,
                boxShadow: `0 0 10px ${themeColor}`
              }} />
            )}
            {/* Premium Glowing Red Indicator for Active Room */}
            {activeNav === "room" && item.id === "room" && (
              <div style={{
                position: "absolute",
                top: -2,
                right: -8,
                width: 6,
                height: 6,
                background: "#FF3B30",
                borderRadius: "50%",
                boxShadow: "0 0 8px #FF3B30, 0 0 12px #FF3B30",
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Live badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "24px" }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: themeColor,
            boxShadow: `0 0 10px ${themeColor}`,
            animation: "pulse 2s infinite",
          }}
        />
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.60)",
            fontWeight: 400,
            letterSpacing: "0.2px"
          }}
        >
          System Online
        </span>
      </div>
      <button
        onClick={handleLogout}
        style={{
          padding: "8px 20px",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.03)",
          color: "rgba(255,255,255,0.92)",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: "14px",
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        }}
      >
        Logout
      </button>
    </nav>
  );
}
