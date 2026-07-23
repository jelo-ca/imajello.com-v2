export function WorldMapDialog({ onClose }: { onClose: () => void }) {
  return <div onClick={e => e.stopPropagation()}>World Map stub <button onClick={onClose}>close</button></div>;
}
