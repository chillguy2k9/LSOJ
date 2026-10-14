'use client';

import React, { useEffect, useRef } from 'react';

interface Bubble {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  wobblePhase: number;
  life: number;
  maxLife: number;
  hue: number;
}

interface WaterRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  expansionSpeed: number;
  hue: number;
}

export default function MouseTrackerBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fluidGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const fluidGlow = fluidGlowRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cache dimensions & rect to completely eliminate getBoundingClientRect layout thrashing
    let rect = container.getBoundingClientRect();
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

    let width = 0;
    let height = 0;

    const updateSize = () => {
      if (!container || !canvas) return;
      rect = container.getBoundingClientRect();
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || 600;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateSize();

    const handleResizeOrScroll = () => {
      updateSize();
    };

    window.addEventListener('resize', handleResizeOrScroll, { passive: true });
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

    // Smooth coordinates for the ambient fluid glow
    let targetX = width / 2;
    let targetY = height / 3;
    let currentX = targetX;
    let currentY = targetY;
    let isVisible = false;

    // Throttle trackers
    let lastBubbleX = -999;
    let lastBubbleY = -999;
    let lastBubbleTime = 0;
    let lastRippleX = -999;
    let lastRippleY = -999;

    const bubbles: Bubble[] = [];
    const ripples: WaterRipple[] = [];

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;

      const clientX = e.clientX;
      const clientY = e.clientY;

      // Check boundary using cached rect
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        if (isVisible) {
          isVisible = false;
          if (fluidGlow) fluidGlow.style.opacity = '0';
        }
        return;
      }

      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      if (!isVisible) {
        isVisible = true;
        if (fluidGlow) fluidGlow.style.opacity = '1';
      }

      targetX = relX;
      targetY = relY;

      const now = performance.now();

      // 1. Gợn sóng loang nước (Ripples) - Throttled by distance
      const dRippleX = relX - lastRippleX;
      const dRippleY = relY - lastRippleY;
      const distRipple = Math.hypot(dRippleX, dRippleY);

      if (distRipple > 28 && ripples.length < 8) {
        lastRippleX = relX;
        lastRippleY = relY;

        ripples.push({
          x: relX,
          y: relY,
          radius: 6,
          maxRadius: Math.min(130, 40 + distRipple * 1.2),
          opacity: 0.5,
          expansionSpeed: 2.2 + Math.random() * 0.8,
          hue: 185 + Math.random() * 30, // Cyan to Aqua
        });
      }

      // 2. Bọt khí nước (Bubbles) - Throttled by distance & time to prevent lag
      const dBubbleX = relX - lastBubbleX;
      const dBubbleY = relY - lastBubbleY;
      const distBubble = Math.hypot(dBubbleX, dBubbleY);

      if ((distBubble > 18 || now - lastBubbleTime > 60) && bubbles.length < 22) {
        lastBubbleX = relX;
        lastBubbleY = relY;
        lastBubbleTime = now;

        bubbles.push({
          x: relX + (Math.random() - 0.5) * 12,
          y: relY + (Math.random() - 0.5) * 12,
          radius: Math.random() * 3 + 2,
          vx: (Math.random() - 0.5) * 0.9,
          vy: -(Math.random() * 1.5 + 0.8), // Float smoothly upwards
          wobbleSpeed: Math.random() * 0.08 + 0.04,
          wobbleAmp: Math.random() * 1.2 + 0.5,
          wobblePhase: Math.random() * Math.PI * 2,
          life: 0,
          maxLife: Math.random() * 30 + 35,
          hue: 184 + Math.random() * 32,
        });
      }
    };

    const handlePointerLeave = () => {
      isVisible = false;
      if (fluidGlow) fluidGlow.style.opacity = '0';
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    // High performance animation loop
    let rafId: number;
    const render = () => {
      // Smooth lerp follow for fluid glow
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      if (fluidGlow && isVisible) {
        fluidGlow.style.transform = `translate3d(${Math.round(currentX - 220)}px, ${Math.round(currentY - 220)}px, 0)`;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. RENDER WATER RIPPLES (Dual ring gradient wave without shadowBlur)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.expansionSpeed;
        r.opacity *= 0.93;

        if (r.opacity <= 0.015 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        const strokeAlpha = r.opacity * 0.6;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${r.hue}, 95%, 65%, ${strokeAlpha})`;
        ctx.lineWidth = Math.max(1, 2.5 * (1 - r.radius / r.maxRadius));
        ctx.stroke();

        // Inner soft echo ring
        if (r.radius > 16) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.65, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${r.hue}, 90%, 60%, ${strokeAlpha * 0.35})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // 2. RENDER AQUATIC BUBBLES (Crystal glass look with specular highlight, 0ms render cost)
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.life++;
        b.wobblePhase += b.wobbleSpeed;
        b.x += b.vx + Math.sin(b.wobblePhase) * b.wobbleAmp;
        b.y += b.vy;

        const progress = b.life / b.maxLife;
        const opacity = Math.max(0, 1 - progress);

        if (b.life >= b.maxLife) {
          bubbles.splice(i, 1);
          continue;
        }

        // Bubble Outer Rim & Subtle Fill
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${b.hue}, 90%, 65%, ${opacity * 0.16})`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${b.hue}, 95%, 78%, ${opacity * 0.8})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Bubble Specular Reflection Glint
        const glintRadius = Math.max(0.7, b.radius * 0.32);
        ctx.beginPath();
        ctx.arc(
          b.x - b.radius * 0.36,
          b.y - b.radius * 0.36,
          glintRadius,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.92})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
    >
      {/* VÙNG ÁNH SÁNG LOANG NƯỚC HỮU CƠ (Tối ưu hóa GPU không dùng CSS blur nặng) */}
      <div
        ref={fluidGlowRef}
        className="absolute top-0 left-0 w-[440px] h-[440px] will-change-transform mix-blend-screen opacity-0 transition-opacity duration-300"
      >
        {/* Lớp loang nước chính */}
        <div
          className="absolute inset-0 animate-water-morph-1 rounded-full"
          style={{
            background: `
              radial-gradient(
                circle at 45% 45%,
                rgba(34, 211, 238, 0.32) 0%,
                rgba(56, 189, 248, 0.18) 35%,
                rgba(99, 102, 241, 0.08) 55%,
                transparent 70%
              )
            `,
          }}
        />

        {/* Lớp loang nước thứ hai xoay ngược chiều */}
        <div
          className="absolute inset-4 animate-water-morph-2 rounded-full"
          style={{
            background: `
              radial-gradient(
                circle at 55% 55%,
                rgba(6, 182, 212, 0.26) 0%,
                rgba(14, 165, 233, 0.14) 40%,
                rgba(168, 85, 247, 0.06) 60%,
                transparent 72%
              )
            `,
          }}
        />
      </div>

      {/* CANVAS VẼ GỢN SÓNG VÀ BỌT NƯỚC SIÊU TỐC */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
      />
    </div>
  );
}

