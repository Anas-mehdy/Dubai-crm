'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SystemSetting, EnvMode } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Webhook,
  Server,
  Globe,
  AlertTriangle,
  Save,
  Loader2,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function WebhooksPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [envMode, setEnvMode] = useState<EnvMode>('test');
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
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

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Webhook className="w-6 h-6 text-primary" />
            Webhook Manager
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure, view, and edit webhook triggers mapped to active n8n workflows in the system
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-sm font-bold uppercase px-4 py-1.5 rounded-full shadow-sm',
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Environment Control */}
        <Card className="border-border/50 lg:col-span-2 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Environment Control
            </CardTitle>
            <CardDescription>
              Toggle between Test and Production environments. This automatically re-routes webhook paths inside n8n.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50">
              <div className="space-y-1">
                <p className="text-sm font-medium">Current Environment Mode</p>
                <p className="text-xs text-muted-foreground">
                  {envMode === 'test'
                    ? 'Test mode active — webhooks utilize the /webhook-test/ path'
                    : 'Production mode active — webhooks utilize the /webhook/ path'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn('text-xs font-semibold tracking-wider transition-colors duration-200', envMode === 'test' ? 'text-amber-400' : 'text-muted-foreground')}>
                  TEST
                </span>
                <Switch
                  checked={envMode === 'production'}
                  onCheckedChange={handleEnvToggle}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <span className={cn('text-xs font-semibold tracking-wider transition-colors duration-200', envMode === 'production' ? 'text-emerald-400' : 'text-muted-foreground')}>
                  PROD
                </span>
              </div>
            </div>

            {envMode === 'test' && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 animate-pulse" />
                <p className="text-xs text-amber-400/80 leading-relaxed">
                  Test mode is currently active. All outgoing and inbound mock webhooks routes will point to n8n test endpoints. No messages will be sent to real clients.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* n8n Connection Card */}
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Instance Settings
            </CardTitle>
            <CardDescription>
              Your base self-hosted n8n connection URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingField
              label="n8n Base URL"
              description="Root URL of your running n8n instance"
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
      </div>

      {/* Workflow Cards */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Workflow Integrations
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure dynamic triggers mapped to n8n JSON configuration files inside the codebase
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Workflow 1: Campaign Sender */}
          <Card className="border-border/50 bg-card/30 relative overflow-hidden group hover:border-border/80 transition-all duration-300 shadow-md">
            <div className="absolute top-0 right-0 p-3 text-[10px] font-mono text-muted-foreground/60 opacity-40 group-hover:opacity-100 transition-opacity bg-muted/40 rounded-bl-xl border-l border-b border-border/40">
              📁 workflow-campaign-sender.json
            </div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-sm shadow-blue-500/50" />
                <CardTitle className="text-sm font-semibold">1. Campaign Message Sender Workflow</CardTitle>
              </div>
              <CardDescription className="max-w-[80%] text-xs">
                Triggered dynamically by the CRM when starting marketing campaigns. Slices prospective lists and triggers Evolution API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <SettingField
                label="Campaign Launch Webhook"
                description="CRM campaign launching trigger. Node: 'Campaign Launch Webhook' (Path: /campaign-sender)"
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
          <Card className="border-border/50 bg-card/30 relative overflow-hidden group hover:border-border/80 transition-all duration-300 shadow-md">
            <div className="absolute top-0 right-0 p-3 text-[10px] font-mono text-muted-foreground/60 opacity-40 group-hover:opacity-100 transition-opacity bg-muted/40 rounded-bl-xl border-l border-b border-border/40">
              📁 workflow-campaign-receipts.json
            </div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                <CardTitle className="text-sm font-semibold">2. Campaign Delivery Receipts Handler</CardTitle>
              </div>
              <CardDescription className="max-w-[80%] text-xs">
                Receives MESSAGE_UPDATE events from Evolution API. Automatically increments total delivered and read metrics in Supabase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <SettingField
                label="Delivery Receipts Webhook"
                description="Point Evolution API MESSAGE_UPDATE subscription here. Node: 'Evolution Delivery Receipt Webhook' (Path: /whatsapp-receipt)"
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
          <Card className="border-border/50 bg-card/30 relative overflow-hidden group hover:border-border/80 transition-all duration-300 shadow-md">
            <div className="absolute top-0 right-0 p-3 text-[10px] font-mono text-muted-foreground/60 opacity-40 group-hover:opacity-100 transition-opacity bg-muted/40 rounded-bl-xl border-l border-b border-border/40">
              📁 workflow-incoming-message.json
            </div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse shadow-sm shadow-violet-500/50" />
                <CardTitle className="text-sm font-semibold">3. WhatsApp Incoming Message & AI Qualification</CardTitle>
              </div>
              <CardDescription className="max-w-[80%] text-xs">
                Listens for inbound replies from Evolution API, triggers OpenAI language / intent filters, and fires hot lead indicators.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <SettingField
                label="Evolution Inbound Message Webhook"
                description="Point Evolution API MESSAGE_UPSERT subscription here. Node: 'Webhook Trigger' (Path: /whatsapp-incoming)"
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
                description="Triggered when a lead is qualified >= 80 by AI model. Node: 'Send HOT Lead Alert' (Path: /hot-lead-alert)"
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
                description="Secondary webhook trigger for manual qualifications or direct testing"
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
    </div>
  );
}

// Sub-component
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
        <Label className="text-sm font-semibold flex items-center gap-1.5 text-foreground/90">
          {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
          {label}
        </Label>
        {envBadge && (
          <Badge
            variant="outline"
            className={cn(
              'text-[9px] font-mono tracking-wider font-semibold border-border/80 px-2.5 py-0.5 rounded',
              envBadge === 'test'
                ? 'bg-amber-500/5 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'
            )}
          >
            {envBadge === 'test' ? '/webhook-test/' : '/webhook/'}
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground/80 leading-normal">{description}</p>
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <Input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-muted/10 border-border/50 text-sm font-mono pr-10 focus:bg-muted/20 focus:border-primary/50 transition-all"
          />
          {onCopy && value && (
            <button
              type="button"
              onClick={onCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 animate-in fade-in zoom-in-75 duration-200" /> : <Copy className="w-3.5 h-3.5 transition-transform group-hover:scale-105" />}
            </button>
          )}
        </div>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="shrink-0 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all font-semibold"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}
