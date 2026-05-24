'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Flame,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  ArrowUpRight,
  Minus,
  Send,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCard {
  label: string;
  value: number;
  change: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    weekLeads: 0,
    hotLeads: 0,
    weekHotLeads: 0,
    converted: 0,
    weekConverted: 0,
    messages: 0,
    weekMessages: 0,
    messagesToday: 0,
    messagesYesterday: 0,
    totalReplied: 0,
    totalSent: 0,
    pendingLeads: 0,
    qualifyingLeads: 0,
  });
  const [recentLeads, setRecentLeads] = useState<
    { id: string; full_name: string; status: string; lead_score: number; area: string | null; nationality_flag: string | null; created_at: string }[]
  >([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch lead counts
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      const { count: weekLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);

      const { count: hotLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'hot');

      const { count: weekHotLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'hot')
        .gte('created_at', sevenDaysAgo);

      const { count: converted } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'converted');

      const { count: weekConverted } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'converted')
        .gte('created_at', sevenDaysAgo);

      const { count: messages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      const { count: weekMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);

      // Messages today
      const todayMidnight = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const { count: messagesToday } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayMidnight);

      // Messages yesterday
      const yesterdayMidnight = new Date(new Date(new Date().setHours(0, 0, 0, 0)).getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { count: messagesYesterday } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterdayMidnight)
        .lt('created_at', todayMidnight);

      // Reply rate from campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('total_replied, total_sent');

      let totalReplied = 0;
      let totalSent = 0;
      if (campaignsData) {
        campaignsData.forEach((c: any) => {
          totalReplied += c.total_replied || 0;
          totalSent += c.total_sent || 0;
        });
      }

      // Pending leads (contacted + qualifying)
      const { count: pendingLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('status', ['contacted', 'qualifying']);

      const { count: qualifyingLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'qualifying');

      setStats({
        totalLeads: totalLeads || 0,
        weekLeads: weekLeads || 0,
        hotLeads: hotLeads || 0,
        weekHotLeads: weekHotLeads || 0,
        converted: converted || 0,
        weekConverted: weekConverted || 0,
        messages: messages || 0,
        weekMessages: weekMessages || 0,
        messagesToday: messagesToday || 0,
        messagesYesterday: messagesYesterday || 0,
        totalReplied,
        totalSent,
        pendingLeads: pendingLeads || 0,
        qualifyingLeads: qualifyingLeads || 0,
      });

      // Fetch recent leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, full_name, status, lead_score, area, nationality_flag, created_at')
        .order('created_at', { ascending: false })
        .limit(8);

      setRecentLeads(leads || []);
    };

    fetchData();

    // Real-time subscription
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const statCards: StatCard[] = [
    {
      label: 'Total Leads',
      value: stats.totalLeads,
      change: stats.weekLeads > 0 ? `+${stats.weekLeads}` : '—',
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Hot Leads',
      value: stats.hotLeads,
      change: stats.weekHotLeads > 0 ? `+${stats.weekHotLeads}` : '—',
      icon: Flame,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
    {
      label: 'Converted',
      value: stats.converted,
      change: stats.weekConverted > 0 ? `+${stats.weekConverted}` : '—',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Messages',
      value: stats.messages,
      change: stats.weekMessages > 0 ? `+${stats.weekMessages}` : '—',
      icon: MessageSquare,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  const replyRate = stats.totalSent > 0 ? (stats.totalReplied / stats.totalSent * 100).toFixed(1) : null;

  const statCards2: StatCard[] = [
    {
      label: 'Messages Today',
      value: stats.messagesToday,
      change: stats.messagesToday > stats.messagesYesterday
        ? `+${stats.messagesToday - stats.messagesYesterday} vs yesterday`
        : '—',
      icon: Send,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
    },
    {
      label: 'Reply Rate',
      value: replyRate !== null ? parseFloat(replyRate) : 0,
      change: stats.totalReplied + ' replies',
      icon: TrendingUp,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Pending Leads',
      value: stats.pendingLeads,
      change: stats.qualifyingLeads > 0 ? stats.qualifyingLeads + ' qualifying' : '—',
      icon: Clock,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
  ];

  const getStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      new: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      hot: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      qualified: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      contacted: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      qualifying: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      converted: 'bg-green-500/15 text-green-400 border-green-500/30',
      lost: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
      dormant: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    };
    return config[status] || config.new;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your Dubai real estate pipeline
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="border-border/50 hover:border-border transition-colors group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">
                      {card.label}
                    </p>
                    <p className="text-3xl font-bold tracking-tight">
                      {card.value.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1">
                      {card.change === '—' ? (
                        <Minus className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        card.change === '—' ? "text-muted-foreground" : "text-emerald-400"
                      )}>
                        {card.change}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">this week</span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
                      card.bgColor
                    )}
                  >
                    <Icon className={cn('w-5 h-5', card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards2.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="border-border/50 hover:border-border transition-colors group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">
                      {card.label}
                    </p>
                    <p className="text-3xl font-bold tracking-tight">
                      {card.label === 'Reply Rate'
                        ? (replyRate !== null ? replyRate + '%' : '—')
                        : card.value.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1">
                      {card.change === '—' ? (
                        <Minus className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        card.change === '—' ? "text-muted-foreground" : "text-emerald-400"
                      )}>
                        {card.change}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
                      card.bgColor
                    )}
                  >
                    <Icon className={cn('w-5 h-5', card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent leads table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Leads</CardTitle>
            <a
              href="/leads"
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No leads yet. They&apos;ll appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead, index) => (
                <a
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors animate-fade-in-up group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary">
                      {lead.nationality_flag || lead.full_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">
                        {lead.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{lead.area || 'No area'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-mono font-bold">{lead.lead_score}</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] capitalize', getStatusBadge(lead.status))}
                    >
                      {lead.status === 'hot' ? '🔥 HOT' : lead.status}
                    </Badge>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
