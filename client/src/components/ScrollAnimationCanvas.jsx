"use client";
import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useSpring } from "framer-motion";
export default function ScrollAnimationCanvas({ scrollYProgress, frameCount = 178, imagePath = "/ezgif-20cf565d542b1b83-jpg/ezgif-frame-" }) {
    const canvasRef = useRef(null);
    const [images, setImages] = useState([]);
    useEffect(() => {
        // Preload images
        const loadedImages = [];
        let loadedCount = 0;
        for (let i = 1; i <= frameCount; i++) {
            const img = new Image();
            const paddedIndex = i.toString().padStart(3, "0");
            img.src = `${imagePath}${paddedIndex}.jpg`;
            img.onload = () => {
                loadedCount++;
                if (loadedCount === frameCount) {
                    setImages(loadedImages);
                    // Draw the first frame immediately once all are loaded
                    drawFrame(loadedImages[0]);
                }
            };
            loadedImages.push(img);
        }
    }, []);
    const drawFrame = (img) => {
        if (!canvasRef.current || !img)
            return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        // Set canvas dimensions to match window
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Calculate aspect ratio to cover the screen (like object-fit: cover)
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    };
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 30,
        damping: 25,
        mass: 1.5,
        restDelta: 0.0001
    });
    useMotionValueEvent(smoothProgress, "change", (latest) => {
        if (images.length === 0)
            return;
        // Map smoothed scroll progress (0-1) to frame index (0-177)
        const frameIndex = Math.min(frameCount - 1, Math.floor(latest * frameCount));
        requestAnimationFrame(() => {
            drawFrame(images[frameIndex]);
        });
    });
    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (images.length > 0) {
                // Redraw current frame
                const latest = scrollYProgress.get();
                const frameIndex = Math.min(frameCount - 1, Math.floor(latest * frameCount));
                drawFrame(images[frameIndex]);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [images, scrollYProgress]);
    return (<canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />);
}
