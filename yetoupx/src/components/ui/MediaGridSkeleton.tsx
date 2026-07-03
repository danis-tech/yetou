interface MediaGridSkeletonProps {
  type?: "photo" | "video";
  count?: number;
}

export default function MediaGridSkeleton({ type = "photo", count = 8 }: MediaGridSkeletonProps) {
  const gridClass = type === "video" ? "video-grid" : "photo-grid";
  const itemClass = type === "video" ? "media-skeleton-video" : "media-skeleton-photo";

  return (
    <div className={gridClass} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`media-skeleton ${itemClass}`} style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="media-skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}
