import React from "react";
import { motion } from "framer-motion";

export default function FloatingOrbs() {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 1 // Above the canvas, below the content
    }}>
      {/* Blue Orb */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -80, 50, 0],
          scale: [1, 1.2, 0.9, 1]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '40vw',
          height: '40vw',
          background: 'radial-gradient(circle, rgba(0, 80, 255, 0.15) 0%, rgba(0, 80, 255, 0) 70%)',
          filter: 'blur(80px)',
          borderRadius: '50%'
        }}
      />
      
      {/* Cyan Orb */}
      <motion.div
        animate={{
          x: [0, -120, 80, 0],
          y: [0, 100, -60, 0],
          scale: [1, 1.1, 0.95, 1]
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          position: 'absolute',
          top: '40%',
          right: '5%',
          width: '35vw',
          height: '35vw',
          background: 'radial-gradient(circle, rgba(0, 214, 255, 0.12) 0%, rgba(0, 214, 255, 0) 70%)',
          filter: 'blur(80px)',
          borderRadius: '50%'
        }}
      />

      {/* Yellow Orb */}
      <motion.div
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -40, 80, 0],
          scale: [0.9, 1.2, 1, 0.9]
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '30%',
          width: '30vw',
          height: '30vw',
          background: 'radial-gradient(circle, rgba(255, 213, 74, 0.08) 0%, rgba(255, 213, 74, 0) 70%)',
          filter: 'blur(80px)',
          borderRadius: '50%'
        }}
      />

      {/* Purple Orb */}
      <motion.div
        animate={{
          x: [0, -90, 70, 0],
          y: [0, -60, 90, 0],
          scale: [1, 1.15, 0.9, 1]
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          position: 'absolute',
          top: '-10%',
          right: '30%',
          width: '45vw',
          height: '45vw',
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0) 70%)',
          filter: 'blur(90px)',
          borderRadius: '50%'
        }}
      />
    </div>
  );
}
