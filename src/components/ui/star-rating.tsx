'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function StarRating({
  value,
  onChange,
  max = 5,
  size = 'md',
  disabled = false,
  readOnly = false,
  className,
  ...props
}: StarRatingProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const isInteractive = !disabled && !readOnly && onChange;

  const handleClick = (rating: number) => {
    if (isInteractive) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (isInteractive) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    if (isInteractive) {
      setHoverValue(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, rating: number) => {
    if (!isInteractive) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onChange(rating);
    } else if (event.key === 'ArrowRight' && rating < max) {
      event.preventDefault();
      onChange(rating + 1);
    } else if (event.key === 'ArrowLeft' && rating > 1) {
      event.preventDefault();
      onChange(rating - 1);
    }
  };

  const displayValue = hoverValue ?? value;

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="radiogroup"
      aria-label="Rating"
      aria-disabled={disabled}
      aria-readonly={readOnly}
      {...props}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
        <button
          key={rating}
          type="button"
          role="radio"
          aria-checked={value === rating}
          aria-label={`${rating} star${rating !== 1 ? 's' : ''}`}
          disabled={disabled}
          className={cn(
            'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
            isInteractive && 'cursor-pointer hover:scale-110',
            !isInteractive && 'cursor-default',
          )}
          onClick={() => handleClick(rating)}
          onMouseEnter={() => handleMouseEnter(rating)}
          onMouseLeave={handleMouseLeave}
          onKeyDown={(e) => handleKeyDown(e, rating)}
          tabIndex={isInteractive ? (value === rating ? 0 : -1) : -1}
        >
          <Star
            className={cn(
              sizeClasses[size],
              'transition-colors',
              rating <= displayValue
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-gray-300',
            )}
          />
        </button>
      ))}
    </div>
  );
}
