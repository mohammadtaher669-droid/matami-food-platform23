import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: number;
}

export default function StarRating({ rating, onRate, size = 20 }: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate?.(star)}
          className={`transition-transform ${onRate ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
          data-testid={`star-${star}`}
        >
          <Star
            size={size}
            className={star <= rating ? "text-primary fill-primary" : "text-white/20"}
          />
        </button>
      ))}
    </div>
  );
}
