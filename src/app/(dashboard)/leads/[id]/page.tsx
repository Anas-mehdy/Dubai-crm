'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Lead, Message } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { LeadScoreRing } from '@/components/leads/lead-score-ring';
import { NationalityBadge } from '@/components/leads/nationality-badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Send,
  Tag,
  Clock,
  User,
  MapPin,
  Building2,
  Banknote,
  Globe,
  Brain,
  ChevronRight,
  X,
  UserCheck,
  StickyNote,
  Loader2,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  STATUS_CONFIG,
  BUDGET_LABELS,
  PROPERTY_LABELS,
  INTENT_LABELS,
  CLIENT_TYPE_LABELS,
} from '@/lib/constants';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Profile, TagMetadata, LeadScoreHistory } from '@/lib/types';
import { Activity, TrendingDown } from 'lucide-react';

export default function LeadDossierPage() {
  const params = useParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUpdatingAgent, setIsUpdatingAgent] = useState(false);
  const [isUpdatingBot, setIsUpdatingBot] = useState(false);
  const [presetTags, setPresetTags] = useState<TagMetadata[]>([]);
  const [scoreHistory, setScoreHistory] = useState<LeadScoreHistory[]>([]);
  const supabase = createClient();

  const fetchScoreHistory = useCallback(async () => {
    const { data } = await supabase
      .from('lead_score_history')
      .select('*')
      .eq('lead_id', params.id)
      .order('created_at', { ascending: false });
    if (data) {
      setScoreHistory(data as LeadScoreHistory[]);
    }
  }, [params.id, supabase]);

  useEffect(() => {
    const fetchLead = async () => {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('id', params.id)
        .single();
      setLead(data as Lead);

      if (data) {
        const leadData = data as Lead;
        if (leadData.custom_fields && typeof leadData.custom_fields === 'object') {
          const cf = leadData.custom_fields as Record<string, any>;
          if (cf.agent_notes) setNotes(cf.agent_notes);
          if (cf.agent_notes_saved_at) setNotesSavedAt(cf.agent_notes_saved_at);
        }
      }

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', params.id)
        .order('created_at', { ascending: true });
      setMessages((msgs as Message[]) || []);
      
      const { data: profilesList } = await supabase
        .from('profiles')
        .select('*')
        .or('role.eq.agent,role.eq.admin')
        .eq('is_active', true);
      setAgents((profilesList as Profile[]) || []);

      // Fetch dynamic preset tags
      const { data: tagsList } = await supabase
        .from('tags_metadata')
        .select('*')
        .order('name');
      if (tagsList) {
        setPresetTags(tagsList as TagMetadata[]);
      }

      // Fetch score history
      fetchScoreHistory();

      setLoading(false);
    };
    fetchLead();

    const channel = supabase
      .channel(`lead-${params.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `lead_id=eq.${params.id}`,
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id, supabase]);

  // ============================================
  // Tags actions
  // ============================================

  const handleAddTag = async (tagToAdd: string) => {
    if (!lead || !tagToAdd.trim()) return;
    const cleanTag = tagToAdd.trim();
    if (lead.tags.includes(cleanTag)) {
      toast.error('Tag already exists.');
      return;
    }
    const updatedTags = [...lead.tags, cleanTag];
    
    setLead({ ...lead, tags: updatedTags });
    
    const { error } = await supabase
      .from('leads')
      .update({ tags: updatedTags })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to add tag.');
      setLead({ ...lead, tags: lead.tags });
    } else {
      toast.success(`Added tag "${cleanTag}"`);
      setTagInput('');
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!lead) return;
    const updatedTags = lead.tags.filter(t => t !== tagToRemove);
    
    setLead({ ...lead, tags: updatedTags });
    
    const { error } = await supabase
      .from('leads')
      .update({ tags: updatedTags })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to remove tag.');
      setLead({ ...lead, tags: lead.tags });
    } else {
      toast.success(`Removed tag "${tagToRemove}"`);
    }
  };

  // ============================================
  // Agent Assignment
  // ============================================
  const handleAssignAgent = async (agentId: string) => {
    if (!lead) return;
    setIsUpdatingAgent(true);
    
    const { error } = await supabase
      .from('leads')
      .update({ assigned_agent_id: agentId || null })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to update agent assignment.');
    } else {
      toast.success('Agent assigned successfully.');
      setLead({ ...lead, assigned_agent_id: agentId || null });
    }
    setIsUpdatingAgent(false);
  };

  // ============================================
  // Save Agent Notes
  // ============================================
  const handleSaveNotes = async () => {
    if (!lead) return;
    setIsSavingNotes(true);
    
    const nowStr = new Date().toLocaleString();
    const updatedCustomFields = {
      ...(lead.custom_fields || {}),
      agent_notes: notes,
      agent_notes_saved_at: nowStr
    };

    const { error } = await supabase
      .from('leads')
      .update({ custom_fields: updatedCustomFields })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to save agent notes.');
    } else {
      toast.success('Agent notes saved successfully.');
      setNotesSavedAt(nowStr);
      setLead({ ...lead, custom_fields: updatedCustomFields });
    }
    setIsSavingNotes(false);
  };

  // ============================================
  // AI Bot Toggle
  // ============================================
  const handleToggleBot = async (checked: boolean) => {
    if (!lead) return;
    setIsUpdatingBot(true);
    
    const { error } = await supabase
      .from('leads')
      .update({ is_bot_active: checked })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to update AI Assistant status.');
    } else {
      toast.success(checked ? '🤖 AI Qualification Assistant activated.' : '⏸️ AI Qualification Assistant paused.');
      setLead({ ...lead, is_bot_active: checked });
    }
    setIsUpdatingBot(false);
  };

  // ============================================
  // Outbound Message sending
  // ============================================
  const handleSendMessage = async () => {
    if (!lead || !newMessage.trim() || isSendingMessage) return;
    setIsSendingMessage(true);
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          lead_id: lead.id,
          content: newMessage.trim(),
          direction: 'outbound',
          status: 'pending',
          is_ai_generated: false
        });

      if (error) {
        toast.error('Failed to send message.');
      } else {
        setNewMessage('');
        
        // Option 3: Auto-silence AI bot when human replies
        if (lead.is_bot_active) {
          const { error: botError } = await supabase
            .from('leads')
            .update({ is_bot_active: false })
            .eq('id', lead.id);
            
          if (!botError) {
            setLead(prev => prev ? { ...prev, is_bot_active: false } : null);
            toast.info('🤖 AI Assistant paused (human takeover)');
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading || !lead) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="animate-pulse"><CardContent className="p-6 h-64" /></Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="animate-pulse"><CardContent className="p-6 h-96" /></Card>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
  const qualSteps = ['Unqualified', 'Language', 'Intent', 'Budget', 'Qualified'];

  // Dynamically calculate current qualification step based on actual data
  let currentStepIndex = 0;
  if (lead.language) currentStepIndex = 1;
  if (lead.intent) currentStepIndex = 2;
  if (lead.budget_tier) currentStepIndex = 3;
  if (lead.status === 'hot' || lead.status === 'converted' || lead.status === 'qualified' || lead.is_bot_active === false) {
    currentStepIndex = 4;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/leads" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Leads
        </Link>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium">{lead.full_name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile Card */}
        <div className="space-y-4">
          <Card className={cn('border-border/50', lead.status === 'hot' && 'border-rose-500/30 animate-pulse-glow')}>
            <CardContent className="p-6 space-y-5">
              {/* Score + Name */}
              <div className="text-center space-y-3">
                <LeadScoreRing score={lead.lead_score} size={80} strokeWidth={5} />
                <div>
                  <h2 className="text-xl font-bold">{lead.full_name}</h2>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    {lead.phone}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
                    {statusConfig.label}
                  </Badge>
                  <NationalityBadge flag={lead.nationality_flag} nationality={lead.nationality} />
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Bot Toggle Section */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                    AI Qualification Active
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {lead.is_bot_active ? '🤖 Bot active & qualifying' : '⏸️ Bot is paused (manual control)'}
                  </p>
                </div>
                <Switch
                  checked={lead.is_bot_active}
                  onCheckedChange={handleToggleBot}
                  disabled={isUpdatingBot}
                />
              </div>

              <Separator className="opacity-50" />

              {/* Detail rows */}
              <div className="space-y-3">
                <DetailRow icon={MapPin} label="Area" value={lead.area} />
                <DetailRow icon={Building2} label="Property" value={lead.property_type ? PROPERTY_LABELS[lead.property_type] : null} />
                <DetailRow icon={Banknote} label="Budget" value={lead.budget_tier ? BUDGET_LABELS[lead.budget_tier] : null} />
                <DetailRow icon={User} label="Type" value={lead.client_type ? CLIENT_TYPE_LABELS[lead.client_type] : null} />
                <DetailRow icon={Globe} label="Intent" value={lead.intent ? INTENT_LABELS[lead.intent] : null} />
                <DetailRow icon={Brain} label="Language" value={lead.language === 'ar' ? 'Arabic 🇦🇪' : 'English 🇬🇧'} />
                <DetailRow icon={MessageSquare} label="Messages" value={String(lead.conversation_count)} />
                <DetailRow icon={Clock} label="Added" value={formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })} />
              </div>

              <Separator className="opacity-50" />

              {/* Tags */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3 text-primary" /> Dynamic Tag Management
                </p>
                <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                  {lead.tags.length > 0 ? (
                    lead.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] bg-muted/40 hover:bg-muted/60 transition-colors flex items-center gap-1 pr-1 border border-border/50">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="rounded-full hover:bg-rose-500/20 hover:text-rose-400 p-0.5 text-muted-foreground transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No tags applied yet</span>
                  )}
                </div>

                {/* Preset Chips */}
                <div className="space-y-1.5">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Suggested Presets</p>
                  <div className="flex flex-wrap gap-1">
                    {presetTags.filter(t => !lead.tags.includes(t.name)).map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleAddTag(tag.name)}
                        className="text-[9px] font-medium transition-all rounded-full px-2 py-0.5 border flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        style={{
                          backgroundColor: tag.color + '10',
                          color: tag.color,
                          borderColor: tag.color + '25'
                        }}
                      >
                        + {tag.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Tag Input */}
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="New custom tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="flex-1 h-8 rounded-lg bg-muted/30 border border-border/50 px-2.5 text-xs focus:outline-none focus:border-primary/50 text-foreground font-sans placeholder:text-muted-foreground/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium px-2.5"
                    onClick={() => handleAddTag(tagInput)}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Agent Assignment */}
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-primary" /> Agent Assignment
                </p>
                <div className="flex gap-2">
                  <Select
                    value={lead.assigned_agent_id || 'unassigned'}
                    onValueChange={(val) => handleAssignAgent(val === 'unassigned' || !val ? '' : val)}
                    disabled={isUpdatingAgent}
                  >
                    <SelectTrigger className="w-full h-8 bg-muted/30 border-border/50 text-xs">
                      {isUpdatingAgent ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Unassigned" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.full_name} ({agent.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Internal Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <StickyNote className="w-3.5 h-3.5 text-primary" /> Internal Agent Notes
                  </p>
                  {notesSavedAt && (
                    <span className="text-[9px] text-muted-foreground/60 italic">
                      Saved {notesSavedAt.split(',')[1] || notesSavedAt}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add private agent notes about client budget, property specifications, or follow-up details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs bg-muted/20 border-border/50 h-20 resize-none font-sans"
                  />
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center gap-1.5"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                  >
                    {isSavingNotes ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <StickyNote className="w-3.5 h-3.5" />
                    )}
                    {isSavingNotes ? 'Saving Notes...' : 'Save Notes'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Qualification Progress */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Qualification Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {qualSteps.map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2',
                      i <= currentStepIndex
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground'
                    )}>
                      {i + 1}
                    </div>
                    <span className={cn(
                      'text-sm',
                      i <= currentStepIndex ? 'font-medium' : 'text-muted-foreground'
                    )}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Qualification & Score History */}
          <Card className="border-border/50 bg-card/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
                Qualification & Score History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {scoreHistory.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground space-y-1.5">
                  <Clock className="w-6 h-6 mx-auto opacity-35" />
                  <p className="text-xs italic">No score changes logged yet.</p>
                </div>
              ) : (
                <div className="relative border-l border-border/40 pl-4 ml-2 space-y-4 text-xs">
                  {scoreHistory.map((log) => {
                    const diff = log.new_score - log.old_score;
                    const isPositive = diff > 0;
                    return (
                      <div key={log.id} className="relative space-y-1">
                        {/* Bullet dot */}
                        <span className={cn(
                          "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-background",
                          isPositive ? "bg-emerald-500 border-emerald-400" : "bg-rose-500 border-rose-400"
                        )} />
                        
                        {/* Title / Score change pill */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-foreground leading-tight">{log.reason}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border shrink-0",
                            isPositive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/25"
                          )}>
                            {log.old_score} &rarr; {log.new_score} ({isPositive ? '+' : ''}{diff})
                          </span>
                        </div>

                        {/* Date label */}
                        <p className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Conversation Thread */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 flex flex-col h-[calc(100vh-220px)]">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Conversation Thread
                <Badge variant="secondary" className="text-[10px] ml-auto">{messages.length} messages</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'max-w-[80%] p-3 rounded-2xl text-sm',
                      msg.direction === 'inbound'
                        ? 'bg-muted/50 mr-auto rounded-bl-md'
                        : 'bg-primary/10 text-foreground ml-auto rounded-br-md'
                    )}
                  >
                    <p>{msg.content}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                      </span>
                      {msg.is_ai_generated && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">
                          AI
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <div className="p-4 border-t border-border/50">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type a message... (Ctrl + Enter to send)"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="resize-none h-10 min-h-[40px] bg-muted/30 border-border/50"
                  rows={1}
                  disabled={isSendingMessage}
                />
                <Button 
                  size="icon" 
                  className="shrink-0 bg-primary hover:bg-primary/90"
                  onClick={handleSendMessage}
                  disabled={isSendingMessage || !newMessage.trim()}
                >
                  {isSendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <span className="text-sm font-medium">{value || '—'}</span>
    </div>
  );
}
