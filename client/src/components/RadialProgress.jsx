import React from "react";
import { motion } from "framer-motion";

export default function RadialProgress({ percentage = 0, color = "#00D6FF", size = 32, strokeWidth = 3 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: size, height: size, position: "relative" }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Background Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress Ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{
              strokeDasharray: circumference,
              filter: `drop-shadow(0 0 4px ${color})`,
            }}
          />
        </svg>
      </div>
      <span style={{ 
        fontFamily: "'Inter', sans-serif", 
        fontSize: "11px", 
        fontWeight: 600, 
        color: color,
        textShadow: `0 0 8px ${color}80`
      }}>
        {percentage}%
      </span>
    </div>
  );
}
