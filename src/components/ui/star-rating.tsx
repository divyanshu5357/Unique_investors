
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  totalStars?: number;
  className?: string;
}

export function StarRating({ rating, totalStars = 5, className }: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[...Array(totalStars)].map((_, index) => {
        const starNumber = index + 1;
        return (
          <Star
            key={starNumber}
            className={cn(
              "h-5 w-5 transition-colors",
              rating >= starNumber ? "text-primary" : "text-muted-foreground/30"
            )}
            fill={rating >= starNumber ? "hsl(var(--primary))" : "transparent"}
          />
        );
      })}
    </div>
  );
}
