'use client';

import { useEffect, useState, useCallback } from 'react';
import { AddLeadModal } from '@/components/leads/add-lead-modal';
import { createClient } from '@/lib/supabase/client';
import type { Lead } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LeadScoreRing } from '@/components/leads/lead-score-ring';
import { NationalityBadge } from '@/components/leads/nationality-badge';
import {
  Users,
  Flame,
  Search,
  Filter,
  MessageSquare,
  Phone,
  Tag,
  Clock,
  ArrowUpRight,
  LayoutGrid,
  List,
  Plus,
  Download,
  Loader2,
  Check,
  Megaphone,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  STATUS_CONFIG,
  BUDGET_LABELS,
  PROPERTY_LABELS,
  INTENT_LABELS,
  DUBAI_AREAS,
  CLIENT_TYPE_LABELS,
} from '@/lib/constants';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: '💬 WhatsApp',
  campaign_bulk: '📣 Campaign',
  manual: '✏️ Manual',
  website: '🌐 Website',
  referral: '🤝 Referral',
  social_media: '📱 Social',
};

const SOURCE_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'campaign_bulk', label: 'Campaign' },
  { value: 'manual', label: 'Manual' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
];

export default function LeadsPriorityPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Selected Filter States
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Filter Data Collections
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([]);

  const [showImport, setShowImport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const supabase = createClient();

  const handleSelectLead = useCallback((leadId: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId) 
        : [...prev, leadId]
    );
  }, []);

  const handleSelectAll = useCallback((leadsToSelect: Lead[]) => {
    const allIds = leadsToSelect.map(l => l.id);
    const allSelected = allIds.every(id => selectedLeadIds.includes(id));
    if (allSelected) {
      setSelectedLeadIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedLeadIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  }, [selectedLeadIds]);

  const exportSelectedLeadsToCSV = useCallback(() => {
    const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));
    if (selectedLeads.length === 0) {
      toast.error('No leads selected.');
      return;
    }
    
    try {
      const headers = [
        'Name',
        'Phone',
        'Area',
        'Property Type',
        'Status',
        'Lead Score',
        'Budget',
        'Intent',
        'Client Type',
        'Nationality',
        'Tags',
        'Created Date'
      ];

      const escapeCSV = (str: string | null | undefined) => {
        if (str === null || str === undefined) return '';
        const text = String(str);
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };

      const rows = selectedLeads.map(lead => [
        escapeCSV(lead.full_name),
        escapeCSV(lead.phone),
        escapeCSV(lead.area || 'N/A'),
        escapeCSV(lead.property_type ? PROPERTY_LABELS[lead.property_type] || lead.property_type : 'N/A'),
        escapeCSV(STATUS_CONFIG[lead.status]?.label || lead.status),
        escapeCSV(String(lead.lead_score)),
        escapeCSV(lead.budget_tier ? BUDGET_LABELS[lead.budget_tier] || lead.budget_tier : 'N/A'),
        escapeCSV(INTENT_LABELS[lead.intent] || lead.intent),
        escapeCSV(CLIENT_TYPE_LABELS[lead.client_type] || lead.client_type),
        escapeCSV(lead.nationality || 'N/A'),
        escapeCSV(lead.tags?.join(', ') || ''),
        escapeCSV(lead.created_at ? format(new Date(lead.created_at), 'yyyy-MM-dd HH:mm') : '')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      link.setAttribute('href', url);
      link.setAttribute('download', `selected_leads_export_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Successfully exported ${selectedLeads.length} selected leads!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to export selected leads.');
    }
  }, [leads, selectedLeadIds]);

  const handleLaunchCampaignForSelection = useCallback(() => {
    const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));
    if (selectedLeads.length === 0) {
      toast.error('No leads selected.');
      return;
    }
    
    const prefilledText = selectedLeads.map(l => 
      `${l.full_name}, ${l.phone}, ${l.area || ''}, ${l.property_type ? PROPERTY_LABELS[l.property_type] || l.property_type : ''}`
    ).join('\n');

    sessionStorage.setItem('prefilled_campaign_leads', prefilledText);
    toast.success(`Prepared ${selectedLeads.length} leads. Redirecting to Campaign wizard...`);
    window.location.href = '/campaigns';
  }, [leads, selectedLeadIds]);

  const exportLeadsToCSV = useCallback(() => {
    if (leads.length === 0) {
      toast.error('No leads to export.');
      return;
    }
    setIsExporting(true);
    try {
      const headers = [
        'Name',
        'Phone',
        'Area',
        'Property Type',
        'Status',
        'Lead Score',
        'Budget',
        'Intent',
        'Client Type',
        'Nationality',
        'Tags',
        'Created Date'
      ];

      const escapeCSV = (str: string | null | undefined) => {
        if (str === null || str === undefined) return '';
        const text = String(str);
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };

      const rows = leads.map(lead => [
        escapeCSV(lead.full_name),
        escapeCSV(lead.phone),
        escapeCSV(lead.area || 'N/A'),
        escapeCSV(lead.property_type ? PROPERTY_LABELS[lead.property_type] || lead.property_type : 'N/A'),
        escapeCSV(STATUS_CONFIG[lead.status]?.label || lead.status),
        escapeCSV(String(lead.lead_score)),
        escapeCSV(lead.budget_tier ? BUDGET_LABELS[lead.budget_tier] || lead.budget_tier : 'N/A'),
        escapeCSV(INTENT_LABELS[lead.intent] || lead.intent),
        escapeCSV(CLIENT_TYPE_LABELS[lead.client_type] || lead.client_type),
        escapeCSV(lead.nationality || 'N/A'),
        escapeCSV(lead.tags?.join(', ') || ''),
        escapeCSV(lead.created_at ? format(new Date(lead.created_at), 'yyyy-MM-dd HH:mm') : '')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_export_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Successfully exported ${leads.length} leads!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to export leads.');
    } finally {
      setIsExporting(false);
    }
  }, [leads]);

  // Fetch static/metadata collections for dropdowns
  useEffect(() => {
    async function fetchMetadata() {
      // 1. Fetch Agents/Admins
      const { data: agentData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['agent', 'admin'])
        .order('full_name');
      if (agentData) {
        setAgents(agentData);
      }

      // 2. Fetch Campaigns
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('id, name')
        .order('name');
      if (campaignData) {
        setCampaigns(campaignData);
      }

      // 3. Fetch Dynamic Tags from Database
      const { data: leadsTags } = await supabase
        .from('leads')
        .select('tags');
      
      const tagSet = new Set<string>();
      // Default presets
      const presets = ['VIP Client', 'Cash Buyer', 'Overseas Investor', 'Mortgage Pre-Approved', 'Callback Requested', 'Do Not Contact', 'Off-Plan Interest', 'Hot Lead'];
      presets.forEach(p => tagSet.add(p));
      
      if (leadsTags) {
        leadsTags.forEach((lead: any) => {
          if (lead.tags) {
            lead.tags.forEach((t: string) => tagSet.add(t));
          }
        });
      }
      setAvailableTags(Array.from(tagSet).sort());
    }

    fetchMetadata();
  }, [supabase]);

  const fetchLeads = useCallback(async () => {
    let query = supabase
      .from('leads')
      .select('*')
      .order('lead_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    
    if (tagFilter !== 'all') {
      query = query.contains('tags', [tagFilter]);
    }

    if (agentFilter !== 'all') {
      query = query.eq('assigned_agent_id', agentFilter);
    }

    if (sourceFilter !== 'all') {
      query = query.eq('source', sourceFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      if (dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('created_at', today);
      } else if (dateFilter === 'yesterday') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', yesterday).lt('created_at', today.toISOString());
      } else if (dateFilter === 'this_week') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', sevenDaysAgo);
      } else if (dateFilter === 'this_month') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', thirtyDaysAgo);
      }
    }

    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
    }

    // Dynamic Campaign Filtering via Junction table
    if (campaignFilter !== 'all') {
      const { data: campaignLeadsData, error } = await supabase
        .from('campaign_leads')
        .select('lead_id')
        .eq('campaign_id', campaignFilter);

      if (error) {
        console.error('Error fetching campaign leads:', error);
      }

      if (campaignLeadsData && campaignLeadsData.length > 0) {
        const leadIds = campaignLeadsData.map((cl: any) => cl.lead_id);
        query = query.in('id', leadIds);
      } else {
        query = query.in('id', ['non-existent-id']);
      }
    }

    const { data } = await query.limit(100);
    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [supabase, statusFilter, tagFilter, agentFilter, dateFilter, campaignFilter, sourceFilter, searchQuery]);

  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchLeads]);

  const hotLeads = leads.filter((l) => l.lead_score >= 80);
  const warmLeads = leads.filter((l) => l.lead_score >= 50 && l.lead_score < 80);
  const coldLeads = leads.filter((l) => l.lead_score < 50);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Priority Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {leads.length} leads · {hotLeads.length} hot · Sorted by score
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
            onClick={exportLeadsToCSV}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export
          </Button>
          <Button
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20"
            onClick={() => setShowImport(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-border/50 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-[150px] h-9 bg-muted/30 border-border/50">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Tag Filter */}
            <Select value={tagFilter} onValueChange={(v) => v && setTagFilter(v)}>
              <SelectTrigger className="w-[140px] h-9 bg-muted/30 border-border/50">
                <Tag className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Campaign Filter */}
            <Select value={campaignFilter} onValueChange={(v) => v && setCampaignFilter(v)}>
              <SelectTrigger className="w-[160px] h-9 bg-muted/30 border-border/50">
                <Megaphone className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((camp) => (
                  <SelectItem key={camp.id} value={camp.id}>
                    {camp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(v) => v && setDateFilter(v)}>
              <SelectTrigger className="w-[130px] h-9 bg-muted/30 border-border/50">
                <Clock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Agent Filter */}
            <Select value={agentFilter} onValueChange={(v) => v && setAgentFilter(v)}>
              <SelectTrigger className="w-[150px] h-9 bg-muted/30 border-border/50">
                <Users className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Source Filter */}
            <Select value={sourceFilter} onValueChange={(v) => v && setSourceFilter(v)}>
              <SelectTrigger className="w-[140px] h-9 bg-muted/30 border-border/50">
                <Globe className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SOURCE_OPTIONS.map((src) => (
                  <SelectItem key={src.value} value={src.value}>
                    {src.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1"></div>
            
            {leads.length > 0 && (
              <div 
                onClick={() => handleSelectAll(leads)}
                className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-lg hover:bg-muted/25 transition-colors cursor-pointer select-none"
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 shrink-0",
                    leads.every(l => selectedLeadIds.includes(l.id))
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border bg-muted/20 hover:border-primary/50"
                  )}
                >
                  {leads.every(l => selectedLeadIds.includes(l.id)) && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs text-muted-foreground font-semibold">
                  Select All
                </span>
              </div>
            )}

            <div className="flex items-center bg-muted/30 rounded-lg border border-border/50">
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-9 w-9 rounded-r-none', view === 'grid' && 'bg-primary/10 text-primary')}
                onClick={() => setView('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-9 w-9 rounded-l-none', view === 'list' && 'bg-primary/10 text-primary')}
                onClick={() => setView('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-border/50 animate-pulse">
              <CardContent className="p-5 h-48" />
            </Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-1">No leads found</h3>
            <p className="text-sm text-muted-foreground">
              Leads will appear here when they come in via WhatsApp or are added manually.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* HOT Leads Section */}
          {hotLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-rose-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-rose-400">
                  Hot Leads ({hotLeads.length})
                </h2>
              </div>
              <div
                className={cn(
                  view === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-2'
                )}
              >
                {hotLeads.map((lead, i) => (
                  <LeadCard 
                    key={lead.id} 
                    lead={lead} 
                    view={view} 
                    index={i} 
                    isHot 
                    isSelected={selectedLeadIds.includes(lead.id)}
                    onSelectLead={handleSelectLead}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Warm Leads */}
          {warmLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                  Warm Leads ({warmLeads.length})
                </h2>
              </div>
              <div
                className={cn(
                  view === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-2'
                )}
              >
                {warmLeads.map((lead, i) => (
                  <LeadCard 
                    key={lead.id} 
                    lead={lead} 
                    view={view} 
                    index={i} 
                    isSelected={selectedLeadIds.includes(lead.id)}
                    onSelectLead={handleSelectLead}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cold Leads */}
          {coldLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Cold Leads ({coldLeads.length})
                </h2>
              </div>
              <div
                className={cn(
                  view === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-2'
                )}
              >
                {coldLeads.map((lead, i) => (
                  <LeadCard 
                    key={lead.id} 
                    lead={lead} 
                    view={view} 
                    index={i} 
                    isSelected={selectedLeadIds.includes(lead.id)}
                    onSelectLead={handleSelectLead}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showImport && (
        <AddLeadModal
          onClose={() => setShowImport(false)}
          onImported={() => { fetchLeads(); setShowImport(false); }}
        />
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/80 backdrop-blur-md border border-border/50 px-6 py-4 rounded-2xl flex items-center gap-6 shadow-2xl animate-fade-in-up md:min-w-[400px]">
          <div className="flex items-center gap-2">
            <span className="w-5.5 h-5.5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
              {selectedLeadIds.length}
            </span>
            <span className="text-sm font-medium">selected</span>
          </div>
          
          <div className="h-5 w-[1px] bg-border/40"></div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-muted/40 border-border/50 text-foreground hover:bg-muted/60"
              onClick={exportSelectedLeadsToCSV}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleLaunchCampaignForSelection}
            >
              <Megaphone className="w-3.5 h-3.5 mr-1.5" />
              Send Campaign
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedLeadIds([])}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// LeadCard Component
// ============================================
function LeadCard({
  lead,
  view,
  index,
  isHot,
  isSelected,
  onSelectLead,
}: {
  lead: Lead;
  view: 'grid' | 'list';
  index: number;
  isHot?: boolean;
  isSelected: boolean;
  onSelectLead: (leadId: string) => void;
}) {
  const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;

  if (view === 'list') {
    return (
      <div className="flex items-center gap-3 w-full group">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onSelectLead(lead.id);
          }}
          className={cn(
            "w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0",
            isSelected 
              ? "bg-primary border-primary text-primary-foreground opacity-100 scale-105" 
              : "border-border/80 bg-muted/20 hover:border-primary/50 opacity-40 group-hover:opacity-100"
          )}
        >
          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
        </div>
        <Link href={`/leads/${lead.id}`} className="flex-1">
          <Card
            className={cn(
              'border-border/50 hover:border-primary/30 transition-all duration-200 cursor-pointer',
              isHot && 'border-rose-500/30 animate-pulse-glow',
              isSelected && 'bg-primary/5 border-primary/30'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <LeadScoreRing score={lead.lead_score} size={40} strokeWidth={3} />
                <div>
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {lead.full_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{lead.phone}</span>
                    {lead.area && (
                      <span className="text-xs text-muted-foreground">· {lead.area}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NationalityBadge flag={lead.nationality_flag} nationality={lead.nationality} />
                {lead.budget_tier && (
                  <Badge variant="outline" className="text-[10px] bg-muted/30 border-border/50">
                    {BUDGET_LABELS[lead.budget_tier]}
                  </Badge>
                )}
                <Badge variant="outline" className={cn('text-[10px]', statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
                {lead.last_message_at && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(lead.last_message_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    );
  }

  return (
    <Link href={`/leads/${lead.id}`} className="block relative group">
      {/* Selection Checkbox */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onSelectLead(lead.id);
        }}
        className={cn(
          "absolute top-3 left-3 z-10 w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 cursor-pointer bg-background/90 backdrop-blur-sm",
          isSelected 
            ? "bg-primary border-primary text-primary-foreground opacity-100 scale-105" 
            : "border-border/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:border-primary/50"
        )}
      >
        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
      </div>

      <Card
        className={cn(
          'border-border/50 hover:border-primary/30 transition-all duration-200 cursor-pointer animate-fade-in-up',
          isHot && 'border-rose-500/30 animate-pulse-glow',
          isSelected && 'bg-primary/5 border-primary/30'
        )}
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <CardContent className="p-5 space-y-4">
          {/* Header row: Score + Status */}
          <div className="flex items-start justify-between">
            <LeadScoreRing score={lead.lead_score} size={52} />
            <Badge variant="outline" className={cn('text-[10px]', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </div>

          {/* Name + Phone */}
          <div>
            <h3 className="font-semibold group-hover:text-primary transition-colors text-base">
              {lead.full_name}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" />
              {lead.phone}
            </p>
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5">
            <NationalityBadge flag={lead.nationality_flag} nationality={lead.nationality} />
            {lead.area && (
              <Badge variant="outline" className="text-[10px] bg-muted/30 border-border/50">
                📍 {lead.area}
              </Badge>
            )}
            {lead.source && (
              <Badge variant="outline" className="text-[10px] bg-muted/30 border-border/50">
                {SOURCE_LABELS[lead.source] || lead.source}
              </Badge>
            )}
            {lead.property_type && (
              <Badge variant="outline" className="text-[10px] bg-muted/30 border-border/50">
                {PROPERTY_LABELS[lead.property_type]}
              </Badge>
            )}
            {lead.budget_tier && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                💰 {BUDGET_LABELS[lead.budget_tier]}
              </Badge>
            )}
          </div>

          {/* Intent + Last message */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              {INTENT_LABELS[lead.intent] || lead.intent}
            </span>
            <div className="flex items-center gap-3">
              {lead.conversation_count > 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {lead.conversation_count}
                </span>
              )}
              {lead.tags.length > 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {lead.tags.length}
                </span>
              )}
              {lead.last_message_at && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(lead.last_message_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
