export function InventoryDialog({ onClose }: { onClose: () => void }) {
  return <div onClick={e => e.stopPropagation()}>Inventory stub <button onClick={onClose}>close</button></div>;
}
