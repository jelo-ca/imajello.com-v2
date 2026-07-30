import { useEffect, useState } from 'react';
import { ui } from '../../content';
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
      <span className={styles.text}>{ui.mobileNotice.text}</span>
      <button className={styles.closeBtn} onClick={dismiss} aria-label={ui.mobileNotice.dismissAriaLabel}>{ui.misc.closeGlyph}</button>
    </div>
  );
}
