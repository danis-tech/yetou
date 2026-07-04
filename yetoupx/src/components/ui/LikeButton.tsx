"use client";

interface LikeButtonProps {
  likes: number;
  isLiked: boolean;
  loading?: boolean;
  size?: "sm" | "md";
  onToggle: () => void;
}

export default function LikeButton({ likes, isLiked, loading = false, size = "sm", onToggle }: LikeButtonProps) {
  return (
    <button
      type="button"
      className={`media-like-btn ${isLiked ? "media-like-btn--active" : ""} media-like-btn--${size}`}
      aria-label={isLiked ? "Retirer le like" : "Aimer ce média"}
      aria-pressed={isLiked}
      disabled={loading}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <i className={`ti ${isLiked ? "ti-heart-filled" : "ti-heart"}`} />
      <span>{likes}</span>
    </button>
  );
}
