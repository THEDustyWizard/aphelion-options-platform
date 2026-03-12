export default function Stars({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5 text-warning text-xs">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < count ? 'opacity-100' : 'opacity-20'}>⭐</span>
      ))}
    </span>
  );
}
