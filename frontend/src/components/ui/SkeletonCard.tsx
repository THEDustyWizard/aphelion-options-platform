export function SkeletonCard({ lines = 4 }: { lines?: number }) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="skeleton h-4 w-24" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-3 ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2 px-3 border-b border-border/50">
      <div className="skeleton h-3 w-8 rounded-sm" />
      <div className="skeleton h-3 flex-1" />
      <div className="skeleton h-3 w-16" />
      <div className="skeleton h-3 w-12" />
    </div>
  );
}

export function SkeletonNewsItem() {
  return (
    <div className="py-2.5 px-3 border-b border-border/50">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="skeleton h-3 w-12" />
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-8 ml-auto" />
      </div>
      <div className="skeleton h-3 w-full mb-1" />
      <div className="skeleton h-3 w-2/3" />
    </div>
  );
}
