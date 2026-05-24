'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NationalityBadgeProps {
  flag: string | null;
  nationality: string | null;
  className?: string;
}

export function NationalityBadge({ flag, nationality, className }: NationalityBadgeProps) {
  if (!flag && !nationality) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[11px] font-medium px-2 py-0.5 bg-muted/30 border-border/50',
        className
      )}
    >
      {flag && <span className="mr-1 text-sm">{flag}</span>}
      {nationality || 'Unknown'}
    </Badge>
  );
}
