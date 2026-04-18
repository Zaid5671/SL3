import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

// --- It's generally better to move these to their own files in a real app ---

// ─── REACT BITS: Hyperspeed (Canvas-based Star Warp) ─────────────────────────
function Hyperspeed({ speed = 1, starColor = "#1D9E75", bgColor = "#080b12" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Star properties
    const numStars = 400;
    let stars = [];

    const initStars = () => {
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
          z: Math.random() * 2000,
          pz: Math.random() * 2000,
        });
      }
    };

    const draw = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        star.z -= 15 * speed; // Speed of the warp

        if (star.z < 1) {
          star.z = 2000;
          star.x = Math.random() * 2000 - 1000;
          star.y = Math.random() * 2000 - 1000;
          star.pz = 2000;
        }

        // Calculate 3D to 2D projection
        const fov = 300;
        const x = cx + (star.x / star.z) * fov;
        const y = cy + (star.y / star.z) * fov;
        const px = cx + (star.x / star.pz) * fov;
        const py = cy + (star.y / star.pz) * fov;

        star.pz = star.z;

        // Draw star trail
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);

        // Intensity based on distance
        const intensity = 1 - star.z / 2000;
        ctx.strokeStyle = `rgba(29, 158, 117, ${intensity})`; // Matching the neon green theme
        ctx.lineWidth = intensity * 2;
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    initStars();
    draw();

    return () => cancelAnimationFrame(animationFrameId);
  }, [speed, bgColor, starColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── REACT BITS: Spotlight Card ──────────────────────────────────────────────
function SpotlightCard({ children, className = "", style = {} }) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`spotlight-card ${className}`}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "20px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        ...style,
      }}
    >
      <div
        className="spotlight"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(29, 158, 117, 0.15), transparent 40%)`,
          opacity: opacity,
          transition: "opacity 0.3s ease",
          zIndex: 1,
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:5000/api/users/login",
        formData,
      );
      console.log("User logged in successfully:", res.data);
      // Store the token and redirect
      localStorage.setItem("token", res.data.token);
      navigate("/"); // Redirect to home page after login
    } catch (err) {
      console.error(
        "Login error:",
        err.response ? err.response.data : err.message,
      );
      // Here you would typically show an error message to the user
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          background: #080b12; 
          color: #e8eaf0; 
          overflow-x: hidden; 
          font-family: 'DM Sans', sans-serif;
        }

        /* Form Inputs */
        .glass-input {
          width: 100%;
          padding: 14px 18px;
          margin-bottom: 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #f0f2f5;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          transition: all 0.3s ease;
          outline: none;
        }
        .glass-input:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: #1D9E75;
          box-shadow: 0 0 15px rgba(29, 158, 117, 0.3);
        }
        .glass-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        /* Submit Button */
        .submit-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #1D9E75, #0f6e56);
          color: #d0f5e8;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
        }
        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(29, 158, 117, 0.4);
        }

        /* Animations */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Background - Hyperspeed */}
      <Hyperspeed speed={1.2} />

      {/* Gradual Blur Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          backdropFilter: "blur(4px)",
          maskImage: "linear-gradient(to bottom, transparent 10%, black 90%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 10%, black 90%)",
        }}
      />

      {/* Main Content Area */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        {/* Spotlight Card Wrapping the Form */}
        <SpotlightCard
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "40px",
            animation: "fadeUp 0.8s cubic-bezier(0.34, 1.05, 0.64, 1) both",
            boxShadow: "0 24px 55px rgba(0,0,0,0.65)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                margin: "0 auto 16px",
                background: "linear-gradient(135deg,#1D9E75,#0f6e56)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 800,
                color: "#d0f5e8",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              S
            </div>
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: "28px",
                color: "#f0f2f5",
                marginBottom: "8px",
              }}
            >
              Sign In
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "14px",
                fontWeight: 300,
              }}
            >
              Access your ShelfLife account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit}>
            <div>
              <input
                className="glass-input"
                type="email"
                placeholder="Email Address"
                name="email"
                value={email}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <input
                className="glass-input"
                type="password"
                placeholder="Password"
                name="password"
                value={password}
                onChange={onChange}
                minLength="6"
                required
              />
            </div>
            <input className="submit-btn" type="submit" value="Sign In" />
          </form>

          {/* Footer */}
          <p
            style={{
              textAlign: "center",
              marginTop: "24px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            Don't have an account?{" "}
            <Link
              to="/register"
              style={{
                color: "#1D9E75",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Sign Up
            </Link>
          </p>
        </SpotlightCard>
      </div>
    </>
  );
};

export default Login;
