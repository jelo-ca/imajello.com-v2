import { useEffect, useRef } from 'react';

export function KonamiOverlay({ trigger }: { trigger: number }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trigger === 0) return;
    const host = hostRef.current;
    if (!host) return;
    const W = window.innerWidth;
    const timers: number[] = [];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('span');
      const fromBottom = Math.random() < 0.5;
      const x = Math.random() * W;
      const size = 12 + Math.random() * 20;
      const dur = 1.4 + Math.random() * 1.2;
      const delay = Math.random() * 0.6;
      s.textContent = '★';
      s.style.cssText = `position:absolute;left:${x}px;${fromBottom ? 'bottom:0;' : 'top:0;'}font-size:${size}px;color:var(--yellow);animation:${fromBottom ? 'konamiStarUp' : 'konamiStarDown'} ${dur}s ease-out ${delay}s forwards;filter:drop-shadow(2px 2px 0 rgb(var(--panel-rgb) / .5))`;
      host.appendChild(s);
      timers.push(window.setTimeout(() => s.remove(), (dur + delay) * 1000 + 100));
    }
    return () => timers.forEach(clearTimeout);
  }, [trigger]);

  return <div ref={hostRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }} />;
}
