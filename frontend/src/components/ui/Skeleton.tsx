interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-28" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="space-y-2 py-2">
      <div className="flex items-end gap-2 h-36">
        {[40, 60, 45, 80, 55, 70, 50, 90].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex justify-between">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-2 w-8" />
        ))}
      </div>
    </div>
  );
}
