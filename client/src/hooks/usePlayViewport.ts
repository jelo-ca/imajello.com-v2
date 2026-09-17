import { useEffect, useState } from 'react';

// Short viewports compress girder rows into the jump height and make clears unfairly
// fast. Phones in portrait clear this bar (iPhone SE is 568 CSS px tall); landscape
// phones are already handled by RotateNotice.
export const MIN_PLAY_HEIGHT = 560;
export const MIN_PLAY_WIDTH = 320;

export function isPlayViewportOk(
  width = typeof window !== 'undefined' ? window.innerWidth : MIN_PLAY_WIDTH,
  height = typeof window !== 'undefined' ? window.innerHeight : MIN_PLAY_HEIGHT,
): boolean {
  return height >= MIN_PLAY_HEIGHT && width >= MIN_PLAY_WIDTH;
}

/** Live playability of the current viewport — updates on resize/orientation change. */
export function usePlayViewportOk(): boolean {
  const [ok, setOk] = useState(() => isPlayViewportOk());

  useEffect(() => {
    const update = () => setOk(isPlayViewportOk());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return ok;
}
