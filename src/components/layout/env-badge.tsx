'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EnvBadgeProps {
  mode: 'test' | 'production';
}

export function EnvBadge({ mode }: EnvBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border',
        mode === 'test'
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      )}
    >
      <span
        className={cn(
          'inline-block w-1.5 h-1.5 rounded-full mr-1.5',
          mode === 'test' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
        )}
      />
      {mode === 'test' ? 'TEST MODE' : 'PRODUCTION'}
    </Badge>
  );
}
