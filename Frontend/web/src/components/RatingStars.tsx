import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export default function RatingStars({
  rating,
  maxRating = 5,
  size = 'md',
  showNumber = false,
  interactive = false,
  onChange
}: RatingStarsProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleClick = (value: number) => {
    if (interactive && onChange) {
      onChange(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= rating;
        const isPartial = starValue > rating && starValue - 1 < rating;
        const partialPercentage = isPartial ? ((rating % 1) * 100) : 0;

        return (
          <div
            key={index}
            className={`relative ${interactive ? 'cursor-pointer' : ''}`}
            onClick={() => handleClick(starValue)}
          >
            {/* Background star (gray) */}
            <Star
              className={`${sizeClasses[size]} text-gray-300`}
              fill="currentColor"
            />
            
            {/* Filled star (yellow) - with partial fill support */}
            {(isFilled || isPartial) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: isPartial ? `${partialPercentage}%` : '100%' }}
              >
                <Star
                  className={`${sizeClasses[size]} text-yellow-400`}
                  fill="currentColor"
                />
              </div>
            )}
          </div>
        );
      })}
      
      {showNumber && (
        <span className="text-sm text-gray-600 mr-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
