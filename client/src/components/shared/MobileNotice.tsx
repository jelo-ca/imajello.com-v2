import { useEffect, useState } from 'react';
import styles from './MobileNotice.module.css';

const DISMISS_KEY = 'imajello-mobile-notice-dismissed';

export function MobileNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches && !sessionStorage.getItem(DISMISS_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  return (
    <div className={styles.banner} role="status">
      <span className={styles.text}>Best experienced on desktop — some features are simplified on mobile.</span>
      <button className={styles.closeBtn} onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}
