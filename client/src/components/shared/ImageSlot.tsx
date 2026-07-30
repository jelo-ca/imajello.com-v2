import { ui } from '../../content';
import styles from './ImageSlot.module.css';

interface Props {
  src?: string;
  alt?: string;
  placeholder: string;
  fit?: 'cover' | 'contain';
  style?: React.CSSProperties;
}

export function ImageSlot({ src, alt = '', placeholder, fit = 'cover', style }: Props) {
  if (src) {
    return <img src={src} alt={alt} style={{ objectFit: fit, width: '100%', height: '100%', ...style }} />;
  }
  return (
    <div className={styles.placeholder} style={style} title={placeholder}>
      <span className={styles.badge}>{ui.imageSlot.comingSoon}</span>
    </div>
  );
}
