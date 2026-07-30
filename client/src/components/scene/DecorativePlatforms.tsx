import { content } from '../../content';
import styles from './DecorativePlatforms.module.css';

export function DecorativePlatforms() {
  return (
    <>
      <div className={styles.desktopOnly}>
        {content.ui.platformer.decorativePlatforms.map((p, i) => (
          <div
            key={i}
            className={styles.platform}
            style={{ top: `${p.top}vh`, left: `${p.left}vw`, width: `${p.width}vw`, height: `${p.height}vh` }}
          />
        ))}
      </div>
      <div className={styles.mobileOnly}>
        {content.ui.platformer.decorativePlatformsMobile.map((p, i) => (
          <div
            key={i}
            className={styles.platform}
            style={{ top: `${p.top}vh`, left: `${p.left}vw`, width: `${p.width}vw`, height: `${p.height}vh` }}
          />
        ))}
      </div>
    </>
  );
}
