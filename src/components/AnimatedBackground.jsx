import React, { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let w, h;

    const particles = [];
    const PARTICLE_COUNT = 55;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        color: Math.random() > 0.5 ? '0, 240, 255' : '168, 85, 247',
      });
    }

    let tick = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Slow gradient shift background
      const t = tick * 0.0008;
      const grad = ctx.createRadialGradient(
        w * (0.3 + 0.1 * Math.sin(t)), h * (0.4 + 0.1 * Math.cos(t * 0.7)), 0,
        w * 0.5, h * 0.5, w * 0.9
      );
      grad.addColorStop(0, 'rgba(15, 10, 40, 1)');
      grad.addColorStop(0.4, 'rgba(10, 10, 35, 1)');
      grad.addColorStop(1, 'rgba(6, 6, 20, 1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Light streaks
      for (let i = 0; i < 3; i++) {
        const sx = (tick * 0.4 + i * 800) % (w + 400) - 200;
        const sy = h * (0.2 + i * 0.3);
        const lg = ctx.createLinearGradient(sx - 150, sy, sx + 150, sy + 2);
        lg.addColorStop(0, 'rgba(0,240,255,0)');
        lg.addColorStop(0.5, `rgba(0,240,255,${0.07 - i * 0.01})`);
        lg.addColorStop(1, 'rgba(0,240,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(sx - 150, sy - 1, 300, 3);
      }

      // Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.fill();
      });

      // Particle connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      tick++;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  );
}