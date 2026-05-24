'use client';

import { Card, CardContent } from '@/components/ui/card';
import { UserCog } from 'lucide-react';

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage agents and their permissions
        </p>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-16 text-center">
          <UserCog className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-1">Agent Management</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Agent profiles, lead assignment rules, and performance tracking. Agents are created via Supabase Auth. Coming in Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
