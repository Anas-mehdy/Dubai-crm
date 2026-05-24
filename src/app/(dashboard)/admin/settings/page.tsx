'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          API key management is available in the Command Center
        </p>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-16 text-center">
          <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-1">System Settings</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Use the Command Center &rarr; API Keys tab for full secret management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
