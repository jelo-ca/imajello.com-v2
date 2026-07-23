import { useEffect } from 'react';
import type { RefObject } from 'react';

const GLYPHS = ['◆', '✦', '●', '＋'];
const COLORS = ['rgba(43,43,48,.16)', 'rgba(194,95,116,.20)', 'rgba(238,154,163,.50)', 'rgba(43,43,48,.11)'];
const TRAIL_COLORS = ['#ee9aa3', '#c25f74', '#2b2b30'];

interface Particle { el: HTMLSpanElement; x: number; y: number; vx: number; vy: number; up: number; phase: number; amp: number; }

export function useParticles(
  hostRef: RefObject<HTMLDivElement | null>,
  cursorHostRef: RefObject<HTMLDivElement | null>,
  cursorRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const host = hostRef.current;
    const cursorHost = cursorHostRef.current;
    const cursor = cursorRef.current;
    if (!host) return;

    const parts: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('span');
      const size = 10 + Math.random() * 20;
      el.textContent = GLYPHS[i % 4];
      el.style.cssText = `position:absolute;left:0;top:0;font:400 ${size}px 'Silkscreen',monospace;color:${COLORS[i % 4]};will-change:transform`;
      host.appendChild(el);
      parts.push({ el, x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, vx: 0, vy: 0, up: 10 + Math.random() * 24, phase: Math.random() * 6.28, amp: 8 + Math.random() * 18 });
    }

    const mouse = { x: -9999, y: -9999 };
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let trailDist = 0;
    let lastMx: number | null = null;
    let lastMy: number | null = null;

    const onMove = (e: MouseEvent) => {
      if (lastMx != null && lastMy != null) trailDist += Math.abs(e.clientX - lastMx) + Math.abs(e.clientY - lastMy);
      lastMx = e.clientX; lastMy = e.clientY;
      mouse.x = e.clientX; mouse.y = e.clientY;
      if (cursor) cursor.style.opacity = '1';
      if (trailDist > 26 && cursorHost) {
        trailDist = 0;
        const s = document.createElement('span');
        const sz = 4 + Math.round(Math.random() * 5);
        const jx = (Math.random() - 0.5) * 14;
        const jy = (Math.random() - 0.5) * 14;
        s.style.cssText = `position:absolute;left:${e.clientX + jx}px;top:${e.clientY + jy}px;width:${sz}px;height:${sz}px;background:${TRAIL_COLORS[Math.floor(Math.random() * 3)]};transform:translate(-50%,-50%);animation:trailFall .65s steps(6) forwards`;
        cursorHost.appendChild(s);
        setTimeout(() => s.remove(), 700);
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    let last = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = window.innerWidth, H = window.innerHeight;
      for (const p of parts) {
        p.phase += dt * 0.7;
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 12100 && d2 > 1) { const d = Math.sqrt(d2); const f = (110 - d) * 9; p.vx += (dx / d) * f * dt; p.vy += (dy / d) * f * dt; }
        p.vx *= Math.pow(0.88, dt * 60); p.vy *= Math.pow(0.88, dt * 60);
        p.x += p.vx * dt + Math.cos(p.phase) * p.amp * dt;
        p.y += p.vy * dt - p.up * dt;
        if (p.y < -40) { p.y = H + 30; p.x = Math.random() * W; }
        if (p.y > H + 60) p.y = -30;
        if (p.x < -40) p.x = W + 30; else if (p.x > W + 40) p.x = -30;
        p.el.style.transform = `translate(${Math.round(p.x / 2) * 2}px,${Math.round(p.y / 2) * 2}px)`;
      }
      if (cursor && mouse.x > -999) {
        const k = Math.min(1, dt * 14);
        cx += (mouse.x - cx) * k;
        cy += (mouse.y - cy) * k;
        cursor.style.transform = `translate(${Math.round(cx)}px,${Math.round(cy)}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
      parts.forEach(p => p.el.remove());
    };
  }, [hostRef, cursorHostRef, cursorRef]);
}
