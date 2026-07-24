import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { INV_ITEMS, INV_GRID_SIZE, INV_FILLED_POSITIONS } from '../../data/invItems';
import { ImageSlot } from '../shared/ImageSlot';
import styles from './InventoryDialog.module.css';

export function InventoryDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const activeItem = INV_ITEMS.find(i => i.key === state.invItem) ?? null;

  const openItem = (key: string) => { tick(); dispatch({ type: 'SET_INV_ITEM', key }); };
  const back = () => { tick(); dispatch({ type: 'INV_BACK' }); };
  const swap = () => { tick(); dispatch({ type: 'SWAP_PHOTOS' }); };

  const slots = Array.from({ length: INV_GRID_SIZE }, (_, i) => {
    const pos = INV_FILLED_POSITIONS.indexOf(i);
    return pos === -1 ? { filled: false as const } : { filled: true as const, item: INV_ITEMS[pos] };
  });

  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[4]</span>
          <span className={styles.title}>Inventory</span>
          <span className={styles.sub}>HOBBIES</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>✕ <span className={styles.escHint}>ESC</span></button>
      </div>

      {!activeItem ? (
        <div className={styles.gridBody}>
          <p className={styles.hint}>CLICK AN ITEM TO VIEW</p>
          <div className={styles.grid}>
            {slots.map((slot, i) => slot.filled ? (
              <button key={i} data-sfx className={styles.slotFilled} onClick={() => openItem(slot.item.key)}>
                {slot.item.icon}
                <span className={styles.slotTag}>{slot.item.tag}</span>
              </button>
            ) : (
              <div key={i} className={styles.slotEmpty} />
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.galleryBody}>
          <button data-sfx className={styles.backBtn} onClick={back}>◀ BACK TO ITEMS</button>
          <div className={styles.galleryGrid}>
            <div className={styles.photoStage}>
              <span className={styles.watermark}>{activeItem.icon}</span>
              <div
                data-sfx
                className={styles.photoA}
                style={{
                  top: state.invPhotoFront === 'first' ? 0 : 78,
                  width: state.invPhotoFront === 'first' ? '64%' : '56%',
                  transform: `rotate(${state.invPhotoFront === 'first' ? -5 : -3}deg)`,
                  zIndex: state.invPhotoFront === 'first' ? 2 : 1,
                }}
                onClick={swap}
              >
                <ImageSlot placeholder={activeItem.photos[0].placeholder} />
              </div>
              <div
                data-sfx
                className={styles.photoB}
                style={{
                  top: state.invPhotoFront === 'first' ? 78 : 0,
                  width: state.invPhotoFront === 'first' ? '56%' : '64%',
                  transform: `rotate(${state.invPhotoFront === 'first' ? 5 : 3}deg)`,
                  zIndex: state.invPhotoFront === 'first' ? 1 : 2,
                }}
                onClick={swap}
              >
                <ImageSlot placeholder={activeItem.photos[1].placeholder} />
              </div>
            </div>
            <div>
              <div className={styles.metaRow}>
                <span className={styles.metaIcon}>{activeItem.icon}</span>
                <span className={styles.metaTag}>{activeItem.tag} · ITEM {INV_ITEMS.findIndex(i => i.key === activeItem.key) + 1}/{INV_ITEMS.length}</span>
              </div>
              <h3 className={styles.itemLabel}>{activeItem.label}</h3>
              <p className={styles.itemDesc}>{activeItem.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
