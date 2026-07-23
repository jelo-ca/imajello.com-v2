export function QuestLogDialog({ onClose }: { onClose: () => void }) {
  return <div onClick={e => e.stopPropagation()}>Quest Log stub <button onClick={onClose}>close</button></div>;
}
