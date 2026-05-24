'use client';

import { Bell, Search, Flame } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EnvBadge } from './env-badge';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EnvMode } from '@/lib/types';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type NotifItem = {
  id: string;
  lead_name: string;
  lead_score: number;
  lead_id: string;
  area: string | null;
  phone: string;
  created_at: string;
  read: boolean;
};

export function Header() {
  const [envMode, setEnvMode] = useState<EnvMode>('test');
  const [notifications, setNotifications] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifItems, setNotifItems] = useState<NotifItem[]>([]);
  const supabase = createClient();
  const bellRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showNotifPanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifPanel]);

  const markAllRead = useCallback(() => {
    setNotifItems((prev) => prev.map((item) => ({ ...item, read: true })));
    setNotifications(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifItems([]);
    setNotifications(0);
  }, []);

  useEffect(() => {
    // Fetch env mode from system settings
    const fetchEnvMode = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'env_mode')
        .single();
      if (data?.value) {
        setEnvMode(data.value as EnvMode);
      }
    };
    fetchEnvMode();

    // Fetch last 15 high-score leads for notification panel
    const fetchHighScoreLeads = async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, name, lead_score, area, phone, created_at')
        .gte('lead_score', 80)
        .order('created_at', { ascending: false })
        .limit(15);
      if (data) {
        const items: NotifItem[] = data.map((lead: any) => ({
          id: lead.id,
          lead_name: lead.name || 'Unknown',
          lead_score: lead.lead_score,
          lead_id: lead.id,
          area: lead.area || null,
          phone: lead.phone || '',
          created_at: lead.created_at,
          read: true,
        }));
        setNotifItems(items);
      }
    };
    fetchHighScoreLeads();

    // Listen for real-time new leads
    const channel = supabase
      .channel('header-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload: any) => {
          const newLead = payload.new;
          if (newLead && newLead.lead_score >= 80) {
            const newItem: NotifItem = {
              id: newLead.id,
              lead_name: newLead.name || 'Unknown',
              lead_score: newLead.lead_score,
              lead_id: newLead.id,
              area: newLead.area || null,
              phone: newLead.phone || '',
              created_at: newLead.created_at,
              read: false,
            };
            setNotifItems((prev) => [newItem, ...prev].slice(0, 15));
            setNotifications((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    // Listen for real-time campaign errors or completions
    const activityChannel = supabase
      .channel('activity-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload: any) => {
          const newLog = payload.new;
          if (newLog.action === 'campaign_error') {
            try {
              const meta = typeof newLog.metadata === 'string' ? JSON.parse(newLog.metadata) : newLog.metadata;
              const campaignName = meta?.campaign_name || 'Campaign';
              const errorMessage = meta?.error || 'Unknown error';
              const nodeName = meta?.node || 'Unknown Node';
              
              toast.error(
                <div className="space-y-1">
                  <p className="font-semibold text-rose-500">🚨 Campaign Error Alert</p>
                  <p className="text-xs"><strong>{campaignName}</strong> has been paused automatically due to a failure in <strong>{nodeName}</strong>.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Reason: {errorMessage}</p>
                </div>,
                { duration: 8000 }
              );
            } catch (err) {
              console.error('Failed to parse campaign error metadata:', err);
            }
          } else if (newLog.action === 'campaign_completed') {
            try {
              const meta = typeof newLog.metadata === 'string' ? JSON.parse(newLog.metadata) : newLog.metadata;
              const campaignName = meta?.campaign_name || 'Campaign';
              
              toast.success(
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-500">🎉 Campaign Completed</p>
                  <p className="text-xs"><strong>{campaignName}</strong> has finished sending all messages successfully!</p>
                </div>,
                { duration: 6000 }
              );
            } catch (err) {
              console.error('Failed to parse campaign completed metadata:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(activityChannel);
    };
  }, [supabase]);

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads, campaigns..."
            className="pl-10 bg-muted/30 border-border/50 h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <EnvBadge mode={envMode} />

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={bellRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setShowNotifPanel((prev) => !prev)}
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {notifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {notifications > 9 ? '9+' : notifications}
              </span>
            )}
          </Button>

          {showNotifPanel && (
            <div className="absolute top-full right-0 mt-2 w-[380px] bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    Mark all read
                  </button>
                  <span className="text-border">·</span>
                  <button
                    onClick={clearAll}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="max-h-[400px] overflow-y-auto">
                {notifItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Bell className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  notifItems.map((item) => (
                    <a
                      key={item.id}
                      href={`/leads/${item.lead_id}`}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/20 last:border-b-0 ${
                        !item.read ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                      }`}
                    >
                      {/* Avatar / Flame */}
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mt-0.5">
                        <span className="text-sm">🔥</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.lead_name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Score: <span className="text-orange-400 font-semibold">{item.lead_score}</span>
                          {item.area && <span className="ml-1.5">· {item.area}</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.phone}</p>
                      </div>

                      {/* Timestamp */}
                      <span className="flex-shrink-0 text-[10px] text-muted-foreground/70 mt-0.5 whitespace-nowrap">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </a>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifItems.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border/40 text-center">
                  <p className="text-[10px] text-muted-foreground/60">Showing last 15 alerts</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
