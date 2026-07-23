export function BattleLogDialog({ onClose }: { onClose: () => void }) {
  return <div onClick={e => e.stopPropagation()}>Battle Log stub <button onClick={onClose}>close</button></div>;
}
