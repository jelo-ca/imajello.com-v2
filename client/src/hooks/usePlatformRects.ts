import { useCallback, useEffect, useState } from 'react';
import { content } from '../content';
import type { SectionKey } from '../data/discoveries';

export interface Platform {
  key: string;
  top: number;
  left: number;
  width: number;
  height: number;
  sectionKey?: SectionKey;
}

const MOBILE_BREAKPOINT = 768;

function decorativePlatforms(): Platform[] {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  const specs = isMobile ? content.ui.platformer.decorativePlatformsMobile : content.ui.platformer.decorativePlatforms;
  const vw = window.innerWidth / 100;
  const vh = window.innerHeight / 100;
  return specs.map((p, i) => ({
    key: `decorative-${i}`,
    top: p.top * vh,
    left: p.left * vw,
    width: p.width * vw,
    height: p.height * vh,
  }));
}

// `platformRefs.current` is a registry keyed by an arbitrary string (see GameScene's
// `setPlatformRef`); keys starting with `nav-` carry a SectionKey suffix so landing on
// that rect can trigger opening the matching dialog (wired in usePlatformerLoop).
export function usePlatformRects(
  platformRefs: React.RefObject<Record<string, HTMLElement | null>>,
  recomputeDeps: unknown[],
): Platform[] {
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  const recompute = useCallback(() => {
    const measured: Platform[] = [];
    for (const [key, el] of Object.entries(platformRefs.current)) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue; // hidden via CSS (e.g. mobile-only/desktop-only elements)
      const sectionKey = key.startsWith('nav-') ? (key.slice(4) as SectionKey) : undefined;
      measured.push({ key, top: rect.top, left: rect.left, width: rect.width, height: rect.height, sectionKey });
    }
    setPlatforms([...measured, ...decorativePlatforms()]);
    // platformRefs is a stable ref object; its .current mutating doesn't need to appear here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformRefs]);

  useEffect(() => {
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
    // recomputeDeps is an intentionally dynamic array of state values the caller wants
    // to force a re-measure on (e.g. a dialog opening changes PlayerBar's mobile layout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recompute, ...recomputeDeps]);

  return platforms;
}
