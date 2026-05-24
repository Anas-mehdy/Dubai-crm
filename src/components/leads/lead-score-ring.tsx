'use client';

import { cn } from '@/lib/utils';
import { getScoreColor } from '@/lib/constants';

interface LeadScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export function LeadScoreRing({
  score,
  size = 52,
  strokeWidth = 4,
  showLabel = true,
  className,
}: LeadScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors = getScoreColor(score);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Score ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(colors.ring, 'animate-score-fill transition-all duration-1000')}
          style={{
            filter: score >= 80 ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))' : undefined,
          }}
        />
      </svg>
      {showLabel && (
        <span
          className={cn(
            'absolute text-xs font-bold font-mono',
            colors.text
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}
