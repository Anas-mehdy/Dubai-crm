'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SystemSetting, EnvMode, MessageTemplate, TagMetadata } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Webhook,
  Key,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Globe,
  Bot,
  Server,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Tag,
  Plus,
  Trash2,
  Edit2,
  X,
  Sparkles,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminCommandCenterPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [envMode, setEnvMode] = useState<EnvMode>('test');
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const supabase = createClient();

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .order('category');
    if (data) {
      setSettings(data as SystemSetting[]);
      const envSetting = data.find((s: SystemSetting) => s.key === 'env_mode');
      if (envSetting?.value) setEnvMode(envSetting.value as EnvMode);
      
      const values: Record<string, string> = {};
      data.forEach((s: SystemSetting) => { values[s.key] = s.value || ''; });
      
      // Ensure defaults for all required workflow webhook keys
      const defaults = [
        'n8n_webhook_incoming',
        'n8n_webhook_qualification',
        'n8n_webhook_campaign',
        'n8n_webhook_hot_lead',
        'n8n_webhook_receipts'
      ];
      defaults.forEach(k => {
        if (values[k] === undefined) {
          values[k] = '';
        }
      });
      
      setEditedValues(values);
    }
    setLoading(false);
  }, [supabase]);

  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [tagsMetadata, setTagsMetadata] = useState<TagMetadata[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  // Template Form State
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<MessageTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', description: '', content: '' });

  // Tag Form State
  const [showAddTag, setShowAddTag] = useState(false);
  const [showEditTag, setShowEditTag] = useState(false);
  const [activeTag, setActiveTag] = useState<TagMetadata | null>(null);
  const [tagForm, setTagForm] = useState({ name: '', color: '#3b82f6', description: '' });

  // Spintax System State & Helpers (Synced globally with Campaign Wizard)
  const DEFAULT_SPINTAXES = [
    '{Hi|Hello|Hey|Greetings|Dear}',
    '{I hope you\'re doing well|Hope you are having a great day|Hope this message finds you well}',
    '{looking for|Interested in|Searching for|Considering}',
    '{amazing|flexible|post-handover|attractive}',
    '{launched|uncovered|released}'
  ];

  const [spintaxes, setSpintaxes] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_spintaxes');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to load user spintaxes:', e);
        }
      }
    }
    return DEFAULT_SPINTAXES;
  });

  const handleAddCustomSpintax = (spintaxToAdd: string) => {
    if (spintaxes.includes(spintaxToAdd)) {
      toast.error('This spintax already exists.');
      return;
    }
    const newSpintaxes = [...spintaxes, spintaxToAdd];
    setSpintaxes(newSpintaxes);
    localStorage.setItem('user_spintaxes', JSON.stringify(newSpintaxes));
    toast.success('Custom spintax saved!');
  };

  const handleDeleteSpintax = (spintaxToDelete: string) => {
    const newSpintaxes = spintaxes.filter(s => s !== spintaxToDelete);
    setSpintaxes(newSpintaxes);
    localStorage.setItem('user_spintaxes', JSON.stringify(newSpintaxes));
    toast.success('Spintax removed.');
  };

  const insertAtCursor = (textareaId: string, textToInsert: string) => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = templateForm.content;
    const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
    
    setTemplateForm(p => ({ ...p, content: newVal }));

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 0);
  };

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setMessageTemplates(data as MessageTemplate[]);
    }
    setLoadingTemplates(false);
  }, [supabase]);

  const fetchTagsMetadata = useCallback(async () => {
    setLoadingTags(true);
    const { data } = await supabase
      .from('tags_metadata')
      .select('*')
      .order('name');
    if (data) {
      setTagsMetadata(data as TagMetadata[]);
    }
    setLoadingTags(false);
  }, [supabase]);

  useEffect(() => {
    fetchSettings();
    fetchTemplates();
    fetchTagsMetadata();
  }, [fetchSettings, fetchTemplates, fetchTagsMetadata]);

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      toast.error('Name and message content are required.');
      return;
    }
    const { error } = await supabase
      .from('message_templates')
      .insert({
        name: templateForm.name.trim(),
        description: templateForm.description.trim() || null,
        content: templateForm.content.trim()
      });
    if (error) {
      toast.error('Failed to create template: ' + error.message);
    } else {
      toast.success('Template created successfully');
      setTemplateForm({ name: '', description: '', content: '' });
      setShowAddTemplate(false);
      fetchTemplates();
    }
  };

  const handleUpdateTemplate = async () => {
    if (!activeTemplate || !templateForm.name.trim() || !templateForm.content.trim()) return;
    const { error } = await supabase
      .from('message_templates')
      .update({
        name: templateForm.name.trim(),
        description: templateForm.description.trim() || null,
        content: templateForm.content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', activeTemplate.id);
    if (error) {
      toast.error('Failed to update template: ' + error.message);
    } else {
      toast.success('Template updated successfully');
      setActiveTemplate(null);
      setTemplateForm({ name: '', description: '', content: '' });
      setShowEditTemplate(false);
      fetchTemplates();
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to delete template: ' + error.message);
    } else {
      toast.success('Template deleted successfully');
      fetchTemplates();
    }
  };

  const handleCreateTag = async () => {
    if (!tagForm.name.trim()) {
      toast.error('Tag name is required.');
      return;
    }
    const { error } = await supabase
      .from('tags_metadata')
      .insert({
        name: tagForm.name.trim(),
        color: tagForm.color,
        description: tagForm.description.trim() || null
      });
    if (error) {
      toast.error('Failed to create tag: ' + error.message);
    } else {
      toast.success('Tag created successfully');
      setTagForm({ name: '', color: '#3b82f6', description: '' });
      setShowAddTag(false);
      fetchTagsMetadata();
    }
  };

  const handleUpdateTag = async () => {
    if (!activeTag || !tagForm.name.trim()) return;
    const { error } = await supabase
      .from('tags_metadata')
      .update({
        name: tagForm.name.trim(),
        color: tagForm.color,
        description: tagForm.description.trim() || null
      })
      .eq('id', activeTag.id);
    if (error) {
      toast.error('Failed to update tag: ' + error.message);
    } else {
      toast.success('Tag updated. Associated leads will sync in background.');
      setActiveTag(null);
      setTagForm({ name: '', color: '#3b82f6', description: '' });
      setShowEditTag(false);
      fetchTagsMetadata();
    }
  };

  const handleDeleteTag = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete tag "${name}" globally? This will remove it from all leads.`)) return;
    const { error } = await supabase
      .from('tags_metadata')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to delete tag: ' + error.message);
    } else {
      toast.success('Tag deleted globally. Lead references cleared.');
      fetchTagsMetadata();
    }
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key,
        value: editedValues[key],
        category: key.startsWith('n8n_') ? 'webhook' : (key.includes('api') || key.includes('key') ? 'api' : 'general'),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      toast.error(`Failed to save ${key}`);
    } else {
      toast.success(`${key} updated successfully`);
      fetchSettings();
    }
    setSaving(false);
  };

  const handleEnvToggle = async () => {
    const newMode = envMode === 'test' ? 'production' : 'test';

    // Auto-switch webhook URLs: /webhook-test/ ↔ /webhook/
    const webhookKeys = [
      'n8n_webhook_incoming',
      'n8n_webhook_qualification',
      'n8n_webhook_campaign',
      'n8n_webhook_hot_lead',
      'n8n_webhook_receipts'
    ];
    const updatedValues = { ...editedValues };

    webhookKeys.forEach((key) => {
      const url = updatedValues[key] || '';
      if (newMode === 'test') {
        updatedValues[key] = url.replace('/webhook/', '/webhook-test/');
      } else {
        updatedValues[key] = url.replace('/webhook-test/', '/webhook/');
      }
    });

    // Save env mode
    await supabase
      .from('system_settings')
      .update({ value: newMode })
      .eq('key', 'env_mode');

    // Save updated webhook URLs (using upsert in case n8n_webhook_receipts wasn't present)
    for (const key of webhookKeys) {
      if (updatedValues[key] !== editedValues[key]) {
        await supabase
          .from('system_settings')
          .upsert({
            key,
            value: updatedValues[key],
            category: 'webhook',
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
      }
    }

    setEnvMode(newMode);
    setEditedValues(updatedValues);
    toast.success(
      `Switched to ${newMode.toUpperCase()} mode. Webhook URLs ${newMode === 'test' ? 'switched to /webhook-test/' : 'switched to /webhook/'}.`
    );
  };

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCopy = (key: string, text: string) => {
    if (!text) {
      toast.error('Webhook URL is empty');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied URL to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getValue = (key: string) => editedValues[key] || '';
  const setValue = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted/30 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6 h-48" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Command Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            System configuration, API keys, webhooks, and environment control
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-sm font-bold uppercase px-4 py-1.5 rounded-full',
            envMode === 'test'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          )}
        >
          <span className={cn(
            'inline-block w-2 h-2 rounded-full mr-2',
            envMode === 'test' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
          )} />
          {envMode === 'test' ? 'TEST MODE' : 'PRODUCTION'}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/30 border border-border/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="secrets">API Keys</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* ============================================
            TAB 1: Overview — Env Toggle + System Health
            ============================================ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Environment Toggle */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Environment Control
                </CardTitle>
                <CardDescription>
                  Toggle between Test and Production. Webhook URLs automatically switch to <code>/webhook-test/</code> or <code>/webhook/</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Current Environment</p>
                    <p className="text-xs text-muted-foreground">
                      {envMode === 'test'
                        ? 'Test mode — webhooks route to /webhook-test/'
                        : 'Production mode — webhooks route to /webhook/'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs font-medium', envMode === 'test' ? 'text-amber-400' : 'text-muted-foreground')}>
                      TEST
                    </span>
                    <Switch
                      checked={envMode === 'production'}
                      onCheckedChange={handleEnvToggle}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                    <span className={cn('text-xs font-medium', envMode === 'production' ? 'text-emerald-400' : 'text-muted-foreground')}>
                      PROD
                    </span>
                  </div>
                </div>

                {envMode === 'test' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-400/80">
                      Test mode is active. All webhook calls will be routed to n8n test endpoints. No messages will be sent to real contacts.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Health */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  System Health
                </CardTitle>
                <CardDescription>Connection status of all integrated services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <HealthRow
                  icon={Server}
                  label="Supabase"
                  status="connected"
                  detail="Database & Auth"
                />
                <HealthRow
                  icon={Webhook}
                  label="n8n"
                  status={getValue('n8n_base_url') ? 'connected' : 'not_configured'}
                  detail={getValue('n8n_base_url') || 'Not configured'}
                />
                <HealthRow
                  icon={MessageCircleIcon}
                  label="Evolution API"
                  status={getValue('evolution_api_url') ? 'connected' : 'not_configured'}
                  detail={getValue('evolution_api_url') || 'Not configured'}
                />
                <HealthRow
                  icon={Bot}
                  label="OpenAI"
                  status={getValue('openai_api_key') ? 'connected' : 'not_configured'}
                  detail={getValue('openai_model') || 'Not configured'}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================
            TAB 2: Webhook Manager
            ============================================ */}
        <TabsContent value="webhooks" className="space-y-6">
          {/* n8n Base Configuration */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                n8n Instance Settings
              </CardTitle>
              <CardDescription>
                Configure the connection details of your self-hosted n8n automation server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingField
                label="n8n Base URL"
                description="Your self-hosted n8n instance base URL"
                value={getValue('n8n_base_url')}
                onChange={(v) => setValue('n8n_base_url', v)}
                onSave={() => handleSave('n8n_base_url')}
                saving={saving}
                placeholder="https://n8n.yourdomain.com"
                icon={Server}
                onCopy={() => handleCopy('n8n_base_url', getValue('n8n_base_url'))}
                copied={copiedKey === 'n8n_base_url'}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-primary" />
                  Workflow Integrations
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure and view webhook triggers mapped to active n8n workflow JSON files in your codebase.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Workflow 1: Campaign Sender */}
              <Card className="border-border/50 bg-card/30 relative overflow-hidden group hover:border-border/80 transition-all">
                <div className="absolute top-0 right-0 p-3 text-[10px] font-mono text-muted-foreground opacity-40 group-hover:opacity-85 transition-opacity bg-muted/45 rounded-bl-xl border-l border-b border-border/40">
                  📁 workflow-campaign-sender.json
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <CardTitle className="text-sm font-semibold">1. Campaign Message Sender Workflow</CardTitle>
                  </div>
                  <CardDescription className="max-w-[80%]">
                    Triggered dynamically by the CRM dashboard when launching campaigns. Filters prospective leads and bulk sends messages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <SettingField
                    label="Campaign Launch Webhook"
                    description="CRM trigger webhook. Node: 'Campaign Launch Webhook' (Path: /campaign-sender)"
                    value={getValue('n8n_webhook_campaign')}
                    onChange={(v) => setValue('n8n_webhook_campaign', v)}
                    onSave={() => handleSave('n8n_webhook_campaign')}
                    saving={saving}
                    placeholder={`https://n8n.domain.com/${envMode === 'test' ? 'webhook-test' : 'webhook'}/campaign-sender`}
                    icon={Webhook}
                    envBadge={envMode}
                    onCopy={() => handleCopy('n8n_webhook_campaign', getValue('n8n_webhook_campaign'))}
                    copied={copiedKey === 'n8n_webhook_campaign'}
                  />
                </CardContent>
              </Card>

              {/* Workflow 2: Campaign Delivery Receipts */}
              <Card className="border-border/50 bg-card/30 relative overflow-hidden group hover:border-border/80 transition-all">
                <div className="absolute top-0 right-0 p-3 text-[10px] font-mono text-muted-foreground opacity-40 group-hover:opacity-85 transition-opacity bg-muted/45 rounded-bl-xl border-l border-b border-border/40">
                  📁 workflow-campaign-receipts.json
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <CardTitle className="text-sm font-semibold">2. Campaign Delivery Receipts Handler</CardTitle>
                  </div>
                  <CardDescription className="max-w-[80%]">
                    Receives MESSAGE_UPDATE callback events from Evolution API. Automatically increments campaign statistics (delivered, read).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <SettingField
                    label="Delivery Receipts Webhook"
                    description="Point your Evolution API MESSAGE_UPDATE subscription here. Node: 'Evolution Delivery Receipt Webhook' (Path: /whatsapp-receipt)"
                    value={getValue('n8n_webhook_receipts')}
                    onChange={(v) => setValue('n8n_webhook_receipts', v)}
                    onSave={() => handleSave('n8n_webhook_receipts')}
                    saving={saving}
                    placeholder={`https://n8n.domain.com/${envMode === 'test' ? 'webhook-test' : 'webhook'}/whatsapp-receipt`}
                    icon={Webhook}
                    envBadge={envMode}
                    onCopy={() => handleCopy('n8n_webhook_receipts', getValue('n8n_webhook_receipts'))}
                    copied={copiedKey === 'n8n_webhook_receipts'}
                  />
                </CardContent>
              </Card>

              {/* Workflow 3: Inbound Message & AI Qualification */}
              <Card className="border-border/50 bg-card/30 relative overflow-hidden group hover:border-border/80 transition-all">
                <div className="absolute top-0 right-0 p-3 text-[10px] font-mono text-muted-foreground opacity-40 group-hover:opacity-85 transition-opacity bg-muted/45 rounded-bl-xl border-l border-b border-border/40">
                  📁 workflow-incoming-message.json
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
                    <CardTitle className="text-sm font-semibold">3. WhatsApp Incoming Message & AI Qualification</CardTitle>
                  </div>
                  <CardDescription className="max-w-[80%]">
                    Listens for inbound replies from Evolution API, performs OpenAI language and intent qualification, and fires hot lead signals.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-0">
                  <SettingField
                    label="Evolution Inbound Message Webhook"
                    description="Point your Evolution API MESSAGE_UPSERT subscription here. Node: 'Webhook Trigger' (Path: /whatsapp-incoming)"
                    value={getValue('n8n_webhook_incoming')}
                    onChange={(v) => setValue('n8n_webhook_incoming', v)}
                    onSave={() => handleSave('n8n_webhook_incoming')}
                    saving={saving}
                    placeholder={`https://n8n.domain.com/${envMode === 'test' ? 'webhook-test' : 'webhook'}/whatsapp-incoming`}
                    icon={Webhook}
                    envBadge={envMode}
                    onCopy={() => handleCopy('n8n_webhook_incoming', getValue('n8n_webhook_incoming'))}
                    copied={copiedKey === 'n8n_webhook_incoming'}
                  />

                  <Separator className="opacity-30" />

                  <SettingField
                    label="HOT Lead Alert Webhook"
                    description="Triggered when a lead is scored >= 80 by the AI Bot. Node: 'Send HOT Lead Alert' (Path: /hot-lead-alert)"
                    value={getValue('n8n_webhook_hot_lead')}
                    onChange={(v) => setValue('n8n_webhook_hot_lead', v)}
                    onSave={() => handleSave('n8n_webhook_hot_lead')}
                    saving={saving}
                    placeholder={`https://n8n.domain.com/${envMode === 'test' ? 'webhook-test' : 'webhook'}/hot-lead-alert`}
                    icon={Webhook}
                    envBadge={envMode}
                    onCopy={() => handleCopy('n8n_webhook_hot_lead', getValue('n8n_webhook_hot_lead'))}
                    copied={copiedKey === 'n8n_webhook_hot_lead'}
                  />

                  <Separator className="opacity-30" />

                  <SettingField
                    label="Qualification Fallback Webhook"
                    description="Additional webhook trigger for manual qualifications or direct testing"
                    value={getValue('n8n_webhook_qualification')}
                    onChange={(v) => setValue('n8n_webhook_qualification', v)}
                    onSave={() => handleSave('n8n_webhook_qualification')}
                    saving={saving}
                    placeholder={`https://n8n.domain.com/${envMode === 'test' ? 'webhook-test' : 'webhook'}/whatsapp-qualification`}
                    icon={Webhook}
                    envBadge={envMode}
                    onCopy={() => handleCopy('n8n_webhook_qualification', getValue('n8n_webhook_qualification'))}
                    copied={copiedKey === 'n8n_webhook_qualification'}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ============================================
            TAB 3: API Keys & Secrets
            ============================================ */}
        <TabsContent value="secrets" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution API */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircleIcon className="w-4 h-4 text-emerald-400" />
                  Evolution API
                </CardTitle>
                <CardDescription>WhatsApp connection via Evolution API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SecretField
                  label="API URL"
                  settingKey="evolution_api_url"
                  value={getValue('evolution_api_url')}
                  onChange={(v) => setValue('evolution_api_url', v)}
                  onSave={() => handleSave('evolution_api_url')}
                  saving={saving}
                  placeholder="https://evolution.yourdomain.com"
                  isSecret={false}
                />
                <SecretField
                  label="API Key"
                  settingKey="evolution_api_key"
                  value={getValue('evolution_api_key')}
                  onChange={(v) => setValue('evolution_api_key', v)}
                  onSave={() => handleSave('evolution_api_key')}
                  saving={saving}
                  placeholder="Your Evolution API key"
                  isSecret
                  revealed={revealedKeys.has('evolution_api_key')}
                  onToggleReveal={() => toggleReveal('evolution_api_key')}
                />
                <SecretField
                  label="Instance Name"
                  settingKey="evolution_instance_name"
                  value={getValue('evolution_instance_name')}
                  onChange={(v) => setValue('evolution_instance_name', v)}
                  onSave={() => handleSave('evolution_instance_name')}
                  saving={saving}
                  placeholder="my-instance"
                  isSecret={false}
                />
                <SecretField
                  label="Agent Notification Phone Number"
                  settingKey="agent_notification_number"
                  value={getValue('agent_notification_number')}
                  onChange={(v) => setValue('agent_notification_number', v)}
                  onSave={() => handleSave('agent_notification_number')}
                  saving={saving}
                  placeholder="+971501234567"
                  isSecret={false}
                />
              </CardContent>
            </Card>

            {/* OpenAI */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="w-4 h-4 text-violet-400" />
                  OpenAI
                </CardTitle>
                <CardDescription>AI-powered lead qualification and language detection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SecretField
                  label="API Key"
                  settingKey="openai_api_key"
                  value={getValue('openai_api_key')}
                  onChange={(v) => setValue('openai_api_key', v)}
                  onSave={() => handleSave('openai_api_key')}
                  saving={saving}
                  placeholder="sk-..."
                  isSecret
                  revealed={revealedKeys.has('openai_api_key')}
                  onToggleReveal={() => toggleReveal('openai_api_key')}
                />
                <SecretField
                  label="Model"
                  settingKey="openai_model"
                  value={getValue('openai_model')}
                  onChange={(v) => setValue('openai_model', v)}
                  onSave={() => handleSave('openai_model')}
                  saving={saving}
                  placeholder="gpt-4o-mini"
                  isSecret={false}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================
            TAB 4: System Limits
            ============================================ */}
        <TabsContent value="system" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Rate Limits & Version Controls
              </CardTitle>
              <CardDescription>Version B limits to prevent WhatsApp bans and ensure compliance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingField
                label="Daily Message Limit"
                description="Maximum outbound messages per day per agent (Version B: 33)"
                value={getValue('daily_message_limit')}
                onChange={(v) => setValue('daily_message_limit', v)}
                onSave={() => handleSave('daily_message_limit')}
                saving={saving}
                placeholder="33"
                icon={MessageCircleIcon}
                type="number"
              />
              <SettingField
                label="Monthly Lead Limit"
                description="Maximum new leads per month (Version B: 1000)"
                value={getValue('monthly_lead_limit')}
                onChange={(v) => setValue('monthly_lead_limit', v)}
                onSave={() => handleSave('monthly_lead_limit')}
                saving={saving}
                placeholder="1000"
                icon={Shield}
                type="number"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================
            TAB 5: Message Templates Library
            ============================================ */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Message Template Library
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage reusable messaging drafts across bulk message campaigns.
              </p>
            </div>
            <Button
              onClick={() => {
                setTemplateForm({ name: '', description: '', content: '' });
                setShowAddTemplate(true);
              }}
              className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs h-9"
            >
              <Plus className="w-4 h-4 mr-1.5" /> New Template
            </Button>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="pl-10 bg-muted/30 border-border/50 h-9 text-xs"
            />
          </div>

          {loadingTemplates ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : messageTemplates.filter(t => t.name.toLowerCase().includes(templateSearch.toLowerCase())).length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-16 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-sm font-semibold mb-1">No templates found</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {templateSearch ? 'Refine your search term.' : 'Click "New Template" to save your first campaign template.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {messageTemplates
                .filter(t => t.name.toLowerCase().includes(templateSearch.toLowerCase()))
                .map((tmpl) => (
                  <Card key={tmpl.id} className="border-border/50 bg-card/25 hover:border-border/80 transition-all flex flex-col group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{tmpl.name}</CardTitle>
                          {tmpl.description && (
                            <CardDescription className="text-[11px] mt-1 line-clamp-1">{tmpl.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            onClick={() => {
                              setActiveTemplate(tmpl);
                              setTemplateForm({
                                name: tmpl.name,
                                description: tmpl.description || '',
                                content: tmpl.content
                              });
                              setShowEditTemplate(true);
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            onClick={() => handleDeleteTemplate(tmpl.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1 flex flex-col">
                      <div className="flex-1 bg-muted/20 border border-border/40 rounded-xl p-3 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {tmpl.content}
                      </div>
                      <div className="text-[9px] text-muted-foreground/50 self-end">
                        Created {new Date(tmpl.created_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* Add Template Modal */}
          {showAddTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Create Message Template
                  </h3>
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setShowAddTemplate(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Template Name *</Label>
                    <Input
                      placeholder="e.g. Off-Plan Villa Offer"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(p => ({ ...p, name: e.target.value }))}
                      className="bg-muted/30 border-border/50 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Description</Label>
                    <Input
                      placeholder="Short notes about target audience or project"
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(p => ({ ...p, description: e.target.value }))}
                      className="bg-muted/30 border-border/50 text-xs"
                    />
                  </div>

                  {/* Spintax Quick Badges */}
                  <div className="space-y-2.5 p-3 bg-muted/10 rounded-xl border border-border/40 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
                      <span>Quick Variables & Spintax Builder</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-muted-foreground mr-1">Variables:</span>
                        <button
                          type="button"
                          onClick={() => insertAtCursor('add-template-content-textarea', '{lead_name}')}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          {'{lead_name}'}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 items-center max-h-24 overflow-y-auto pr-1">
                        <span className="text-[10px] text-muted-foreground mr-1">Spintax:</span>
                        {spintaxes.map((spin, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-0.5 text-[10px] font-mono rounded-md border border-border bg-background hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all max-w-[180px] overflow-hidden"
                            title={spin}
                          >
                            <button
                              type="button"
                              onClick={() => insertAtCursor('add-template-content-textarea', spin)}
                              className="px-2 py-0.5 text-left truncate flex-1 cursor-pointer"
                            >
                              {spin}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSpintax(spin);
                              }}
                              className="p-0.5 hover:bg-rose-500/20 hover:text-rose-400 rounded transition-colors mr-1 shrink-0 cursor-pointer"
                              title="Delete spintax"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Custom Spintax Creator */}
                      <div className="flex items-center gap-2 pt-2.5 border-t border-border/20 mt-1">
                        <span className="text-[10px] text-muted-foreground shrink-0">Custom Spin:</span>
                        <div className="flex-1 flex gap-1.5">
                          <input
                            type="text"
                            placeholder="e.g. Excellent, Great, Superb"
                            id="add-template-custom-spin-input"
                            className="flex-1 h-7 rounded-md bg-background border border-border px-2.5 text-[10px] focus:outline-none focus:border-primary/50 text-foreground font-sans placeholder:text-muted-foreground/45"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const btn = document.getElementById('add-template-custom-spin-btn');
                                btn?.click();
                              }
                            }}
                          />
                          <button
                            type="button"
                            id="add-template-custom-spin-btn"
                            onClick={() => {
                              const input = document.getElementById('add-template-custom-spin-input') as HTMLInputElement;
                              if (!input || !input.value.trim()) {
                                toast.error('Please enter comma-separated choices.');
                                return;
                              }
                              const choices = input.value.split(',').map(c => c.trim()).filter(Boolean);
                              if (choices.length < 2) {
                                toast.error('Please enter at least 2 choices separated by commas.');
                                return;
                              }
                              const spintax = `{${choices.join('|')}}`;
                              handleAddCustomSpintax(spintax);
                              input.value = '';
                            }}
                            className="h-7 px-2.5 text-[10px] bg-primary/15 text-primary hover:bg-primary/20 border border-primary/20 hover:border-primary/35 rounded-md font-semibold transition-all shrink-0 cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium">Message Body *</Label>
                      <span className="text-[10px] text-primary/80 font-mono">Use {'{lead_name}'} for dynamic tags</span>
                    </div>
                    <textarea
                      id="add-template-content-textarea"
                      placeholder="Hello {lead_name}! This is..."
                      value={templateForm.content}
                      onChange={(e) => setTemplateForm(p => ({ ...p, content: e.target.value }))}
                      className="w-full h-32 text-xs bg-muted/20 border border-border/50 rounded-lg p-2.5 resize-none font-sans focus:outline-none focus:border-primary/50 text-foreground"
                    />
                  </div>
                </div>
                <div className="p-4 bg-muted/10 border-t border-border/40 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddTemplate(false)} className="text-xs">Cancel</Button>
                  <Button size="sm" onClick={handleCreateTemplate} className="text-xs bg-primary text-primary-foreground">Create Template</Button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Template Modal */}
          {showEditTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-primary" /> Edit Message Template
                  </h3>
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setShowEditTemplate(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Template Name *</Label>
                    <Input
                      placeholder="e.g. Off-Plan Villa Offer"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(p => ({ ...p, name: e.target.value }))}
                      className="bg-muted/30 border-border/50 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Description</Label>
                    <Input
                      placeholder="Short notes about target audience or project"
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(p => ({ ...p, description: e.target.value }))}
                      className="bg-muted/30 border-border/50 text-xs"
                    />
                  </div>

                  {/* Spintax Quick Badges */}
                  <div className="space-y-2.5 p-3 bg-muted/10 rounded-xl border border-border/40 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
                      <span>Quick Variables & Spintax Builder</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-muted-foreground mr-1">Variables:</span>
                        <button
                          type="button"
                          onClick={() => insertAtCursor('edit-template-content-textarea', '{lead_name}')}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          {'{lead_name}'}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 items-center max-h-24 overflow-y-auto pr-1">
                        <span className="text-[10px] text-muted-foreground mr-1">Spintax:</span>
                        {spintaxes.map((spin, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-0.5 text-[10px] font-mono rounded-md border border-border bg-background hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all max-w-[180px] overflow-hidden"
                            title={spin}
                          >
                            <button
                              type="button"
                              onClick={() => insertAtCursor('edit-template-content-textarea', spin)}
                              className="px-2 py-0.5 text-left truncate flex-1 cursor-pointer"
                            >
                              {spin}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSpintax(spin);
                              }}
                              className="p-0.5 hover:bg-rose-500/20 hover:text-rose-400 rounded transition-colors mr-1 shrink-0 cursor-pointer"
                              title="Delete spintax"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Custom Spintax Creator */}
                      <div className="flex items-center gap-2 pt-2.5 border-t border-border/20 mt-1">
                        <span className="text-[10px] text-muted-foreground shrink-0">Custom Spin:</span>
                        <div className="flex-1 flex gap-1.5">
                          <input
                            type="text"
                            placeholder="e.g. Excellent, Great, Superb"
                            id="edit-template-custom-spin-input"
                            className="flex-1 h-7 rounded-md bg-background border border-border px-2.5 text-[10px] focus:outline-none focus:border-primary/50 text-foreground font-sans placeholder:text-muted-foreground/45"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const btn = document.getElementById('edit-template-custom-spin-btn');
                                btn?.click();
                              }
                            }}
                          />
                          <button
                            type="button"
                            id="edit-template-custom-spin-btn"
                            onClick={() => {
                              const input = document.getElementById('edit-template-custom-spin-input') as HTMLInputElement;
                              if (!input || !input.value.trim()) {
                                toast.error('Please enter comma-separated choices.');
                                return;
                              }
                              const choices = input.value.split(',').map(c => c.trim()).filter(Boolean);
                              if (choices.length < 2) {
                                toast.error('Please enter at least 2 choices separated by commas.');
                                return;
                              }
                              const spintax = `{${choices.join('|')}}`;
                              handleAddCustomSpintax(spintax);
                              input.value = '';
                            }}
                            className="h-7 px-2.5 text-[10px] bg-primary/15 text-primary hover:bg-primary/20 border border-primary/20 hover:border-primary/35 rounded-md font-semibold transition-all shrink-0 cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium">Message Body *</Label>
                      <span className="text-[10px] text-primary/80 font-mono">Use {'{lead_name}'} for dynamic tags</span>
                    </div>
                    <textarea
                      id="edit-template-content-textarea"
                      placeholder="Hello {lead_name}! This is..."
                      value={templateForm.content}
                      onChange={(e) => setTemplateForm(p => ({ ...p, content: e.target.value }))}
                      className="w-full h-32 text-xs bg-muted/20 border border-border/50 rounded-lg p-2.5 resize-none font-sans focus:outline-none focus:border-primary/50 text-foreground"
                    />
                  </div>
                </div>
                <div className="p-4 bg-muted/10 border-t border-border/40 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowEditTemplate(false)} className="text-xs">Cancel</Button>
                  <Button size="sm" onClick={handleUpdateTemplate} className="text-xs bg-primary text-primary-foreground">Save Changes</Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ============================================
            TAB 6: Centralized Tag Management
            ============================================ */}
        <TabsContent value="tags" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Global Tag Classifications
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Centralize customer status tags. Renaming or deleting tags re-syncs lead categories automatically.
              </p>
            </div>
            <Button
              onClick={() => {
                setTagForm({ name: '', color: '#3b82f6', description: '' });
                setShowAddTag(true);
              }}
              className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs h-9"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Define Tag
            </Button>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tags by name..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              className="pl-10 bg-muted/30 border-border/50 h-9 text-xs"
            />
          </div>

          {loadingTags ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : tagsMetadata.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-16 text-center">
                <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-sm font-semibold mb-1">No tags configured</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {tagSearch ? 'Refine your search term.' : 'Click "Define Tag" to add custom category groupings.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/50 text-xs text-muted-foreground bg-muted/10 font-semibold">
                        <th className="p-4">Visual Badge</th>
                        <th className="p-4">Description</th>
                        <th className="p-4">Color Hex</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 text-xs">
                      {tagsMetadata
                        .filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                        .map((tag) => (
                          <tr key={tag.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-4">
                              <span
                                className="px-2.5 py-1 rounded-full font-semibold border text-[10px]"
                                style={{
                                  backgroundColor: tag.color + '15',
                                  color: tag.color,
                                  borderColor: tag.color + '30'
                                }}
                              >
                                {tag.name}
                              </span>
                            </td>
                            <td className="p-4 text-muted-foreground font-medium">
                              {tag.description || <span className="italic opacity-40">No description provided</span>}
                            </td>
                            <td className="p-4 font-mono text-[10px] text-muted-foreground">{tag.color}</td>
                            <td className="p-4 text-right flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                onClick={() => {
                                  setActiveTag(tag);
                                  setTagForm({
                                    name: tag.name,
                                    color: tag.color,
                                    description: tag.description || ''
                                  });
                                  setShowEditTag(true);
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                onClick={() => handleDeleteTag(tag.id, tag.name)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Tag Modal */}
          {showAddTag && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" /> Define Custom Tag
                  </h3>
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setShowAddTag(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Tag Name *</Label>
                    <Input
                      placeholder="e.g. VIP Buyer"
                      value={tagForm.name}
                      onChange={(e) => setTagForm(p => ({ ...p, name: e.target.value }))}
                      className="bg-muted/30 border-border/50 text-xs"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Color Palette</Label>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {[
                        '#ef4444', // Red
                        '#f97316', // Orange
                        '#eab308', // Yellow
                        '#22c55e', // Green
                        '#06b6d4', // Cyan
                        '#3b82f6', // Blue
                        '#8b5cf6', // Purple
                        '#ec4899', // Pink
                      ].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTagForm(p => ({ ...p, color: c }))}
                          className={cn(
                            "w-6.5 h-6.5 rounded-full border transition-transform duration-100 active:scale-95 flex items-center justify-center",
                            tagForm.color === c ? "border-foreground ring-1 ring-offset-1 ring-primary/40 scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                        >
                          {tagForm.color === c && <Check className="w-3 h-3 text-background drop-shadow font-black" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Description</Label>
                    <Input
                      placeholder="e.g. Leads looking for luxury properties"
                      value={tagForm.description}
                      onChange={(e) => setTagForm(p => ({ ...p, description: e.target.value }))}
                      className="bg-muted/30 border-border/50 text-xs"
                    />
                  </div>
                </div>
                <div className="p-4 bg-muted/10 border-t border-border/40 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddTag(false)} className="text-xs">Cancel</Button>
                  <Button size="sm" onClick={handleCreateTag} className="text-xs bg-primary text-primary-foreground">Create Tag</Button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Tag Modal */}
          {showEditTag && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-primary" /> Edit Custom Tag
                  </h3>
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setShowEditTag(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Tag Name *</Label>
                    <Input
                      placeholder="e.g. VIP Buyer"
                      value={tagForm.name}
                      onChange={(e) => setTagForm(p => ({ ...p, name: e.target.value }))}
                      className="bg-muted/30 border-border/50 text-xs"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Color Palette</Label>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {[
                        '#ef4444',
                        '#f97316',
                        '#eab308',
                        '#22c55e',
                        '#06b6d4',
                        '#3b82f6',
                        '#8b5cf6',
                        '#ec4899',
                      ].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTagForm(p => ({ ...p, color: c }))}
                          className={cn(
                            "w-6.5 h-6.5 rounded-full border transition-transform duration-100 active:scale-95 flex items-center justify-center",
                            tagForm.color === c ? "border-foreground ring-1 ring-offset-1 ring-primary/40 scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                        >
                          {tagForm.color === c && <Check className="w-3 h-3 text-background drop-shadow font-black" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Description</Label>
                    <Input
                      placeholder="e.g. Leads looking for luxury properties"
                      value={tagForm.description}
                      onChange={(e) => setTagForm(p => ({ ...p, description: e.target.value }))}
                      className="bg-muted/30 border-border/50 text-xs"
                    />
                  </div>
                </div>
                <div className="p-4 bg-muted/10 border-t border-border/40 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowEditTag(false)} className="text-xs">Cancel</Button>
                  <Button size="sm" onClick={handleUpdateTag} className="text-xs bg-primary text-primary-foreground">Save Changes</Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================
function MessageCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function SettingField({
  label,
  description,
  value,
  onChange,
  onSave,
  saving,
  placeholder,
  icon: Icon,
  type = 'text',
  envBadge,
  onCopy,
  copied,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  placeholder: string;
  icon?: React.ElementType;
  type?: string;
  envBadge?: EnvMode;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
          {label}
        </Label>
        {envBadge && (
          <Badge
            variant="outline"
            className={cn(
              'text-[9px]',
              envBadge === 'test'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            )}
          >
            {envBadge === 'test' ? '/webhook-test/' : '/webhook/'}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-muted/30 border-border/50 text-sm font-mono pr-10"
          />
          {onCopy && value && (
            <button
              type="button"
              onClick={onCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="shrink-0 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function SecretField({
  label,
  settingKey,
  value,
  onChange,
  onSave,
  saving,
  placeholder,
  isSecret,
  revealed,
  onToggleReveal,
}: {
  label: string;
  settingKey: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  placeholder: string;
  isSecret: boolean;
  revealed?: boolean;
  onToggleReveal?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={isSecret && !revealed ? 'password' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-muted/30 border-border/50 text-sm font-mono pr-10"
          />
          {isSecret && onToggleReveal && (
            <button
              type="button"
              onClick={onToggleReveal}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="shrink-0 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function HealthRow({
  icon: Icon,
  label,
  status,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  status: 'connected' | 'disconnected' | 'not_configured';
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/30">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          status === 'connected' ? 'bg-emerald-500/10' : 'bg-muted/30'
        )}>
          <Icon className={cn(
            'w-4 h-4',
            status === 'connected' ? 'text-emerald-400' : 'text-muted-foreground'
          )} />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{detail}</p>
        </div>
      </div>
      <div className={cn(
        'w-2.5 h-2.5 rounded-full',
        status === 'connected' && 'bg-emerald-400 shadow-sm shadow-emerald-400/50',
        status === 'disconnected' && 'bg-red-400 shadow-sm shadow-red-400/50',
        status === 'not_configured' && 'bg-zinc-500'
      )} />
    </div>
  );
}
