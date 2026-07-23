export function ContactDialog({ onClose }: { onClose: () => void }) {
  return <div onClick={e => e.stopPropagation()}>Contact stub <button onClick={onClose}>close</button></div>;
}
