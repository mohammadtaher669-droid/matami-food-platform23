export function SkeletonRestaurantCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-white/5 animate-pulse">
      <div className="h-44 bg-white/5" />
      <div className="p-4 space-y-3 pt-2">
        <div className="flex gap-3 items-start">
          <div className="w-14 h-14 rounded-xl bg-white/5 flex-shrink-0 -mt-7" />
          <div className="flex-1 pt-2 space-y-2">
            <div className="h-4 bg-white/8 rounded-lg w-3/4" />
            <div className="h-3 bg-white/5 rounded-lg w-1/2" />
          </div>
        </div>
        <div className="flex gap-4 pt-1">
          <div className="h-3 bg-white/5 rounded w-10" />
          <div className="h-3 bg-white/5 rounded w-14" />
          <div className="h-3 bg-white/5 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonItemCard() {
  return (
    <div className="flex-shrink-0 w-40 rounded-2xl overflow-hidden bg-card border border-white/5 animate-pulse">
      <div className="h-36 bg-white/5" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-white/8 rounded w-full" />
        <div className="h-3 bg-white/5 rounded w-2/3" />
        <div className="h-3 bg-white/5 rounded w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonBanner() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ height: 220 }}>
      <div className="w-full h-full bg-white/5" />
    </div>
  );
}
