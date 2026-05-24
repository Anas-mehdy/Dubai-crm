'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Campaign, CampaignStatus, Category, PropertyType, MessageTemplate } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Megaphone, Plus, Search, Send, Pause, Play,
  CheckCircle2, FileText, TrendingUp, Users,
  X, ChevronRight, Zap, Target, MessageSquare,
  Sparkles, UserPlus, RotateCcw, AlertCircle, Trash2,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { PROPERTY_LABELS, DUBAI_AREAS } from '@/lib/constants';

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string; icon: React.ElementType }> = {
  draft:     { label: 'Draft',     className: 'bg-slate-500/15 text-slate-400 border-slate-500/30',   icon: FileText },
  active:    { label: 'Active',    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Zap },
  paused:    { label: 'Paused',    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   icon: Pause },
  completed: { label: 'Completed', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',     icon: CheckCircle2 },
};

function DeliveryBar({ sent, delivered, read, replied }: { sent: number; delivered: number; read: number; replied: number }) {
  if (sent === 0) return <div className="h-1.5 rounded-full bg-muted/30 w-full" />;

  // Calculate net exclusive counts for progression states
  const netDelivered = Math.max(0, delivered - read);
  const netRead = Math.max(0, read - replied);
  const netReplied = replied;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden bg-muted/20 w-full">
        <div className="bg-blue-500/60 transition-all text-xs" style={{ width: `${(netDelivered / sent) * 100}%` }} />
        <div className="bg-emerald-500/60 transition-all text-xs" style={{ width: `${(netRead / sent) * 100}%` }} />
        <div className="bg-violet-500/60 transition-all text-xs" style={{ width: `${(netReplied / sent) * 100}%` }} />
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 inline-block" />{netDelivered} delivered</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 inline-block" />{netRead} read</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500/60 inline-block" />{netReplied} replied</span>
      </div>
    </div>
  );
}

function StatMini({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold">{value.toLocaleString()}{suffix}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Parsing & Validation Types & Helpers ─────────────────────────────────
interface ParsedRow {
  id: string;
  name: string;
  phone: string;
  area: string;
  property_type: string;
  category_raw?: string;
  nameOk: boolean;
  phoneOk: boolean;
}

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const AREA_KEYWORDS: Record<string, string> = {
  marina: 'Dubai Marina', palm: 'Palm Jumeirah', downtown: 'Downtown Dubai',
  'business bay': 'Business Bay', jbr: 'JBR', difc: 'DIFC',
  'dubai hills': 'Dubai Hills Estate', ranches: 'Arabian Ranches',
  jvc: 'Jumeirah Village Circle', creek: 'Dubai Creek Harbour',
  bluewaters: 'Bluewaters Island', 'city walk': 'City Walk',
  meydan: 'Meydan', barsha: 'Al Barsha', jumeirah: 'Jumeirah',
  deira: 'Deira', silicon: 'Dubai Silicon Oasis', 'motor city': 'Motor City',
  'sports city': 'Sports City', 'dubai south': 'Dubai South',
  mbr: 'MBR City', damac: 'Damac Hills', 'emirates hills': 'Emirates Hills',
  furjan: 'Al Furjan', discovery: 'Discovery Gardens', jlt: 'Jumeirah Lake Towers',
  mudon: 'Mudon', mirdif: 'Mirdif', arjan: 'Arjan', dubailand: 'Dubailand',
};
const PROPERTY_KEYWORDS: Record<string, PropertyType> = {
  apartment: 'apartment', apt: 'apartment', flat: 'apartment', studio: 'apartment',
  villa: 'villa', townhouse: 'townhouse', town: 'townhouse', penthouse: 'penthouse',
  plot: 'plot', land: 'plot', commercial: 'commercial', office: 'commercial',
  'off plan': 'off_plan', 'off-plan': 'off_plan', offplan: 'off_plan',
};

function normalisePhone(raw: string): string {
  let p = raw.trim().replace(/[\s\-().]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('05') || p.startsWith('5')) {
    if (!p.startsWith('+')) p = '+971' + p.replace(/^0/, '');
  }
  return p;
}

function detectArea(raw: string): string {
  const lower = raw.toLowerCase();
  for (const [kw, canonical] of Object.entries(AREA_KEYWORDS)) {
    if (lower.includes(kw)) return canonical;
  }
  return raw.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function detectPropertyType(raw: string): string {
  const lower = raw.toLowerCase();
  for (const [kw, type] of Object.entries(PROPERTY_KEYWORDS)) {
    if (lower.includes(kw)) return type;
  }
  return '';
}

function matchCategory(raw: string | undefined, categories: Category[]): Category | undefined {
  if (!raw) return undefined;
  const lower = raw.trim().toLowerCase();

  const exactMatch = categories.find(c => c.name.toLowerCase() === lower);
  if (exactMatch) return exactMatch;

  const keywords: { kw: string; target: string }[] = [
    { kw: 'buyer', target: 'Buyer' },
    { kw: 'buy', target: 'Buyer' },
    { kw: 'seller', target: 'Seller' },
    { kw: 'sell', target: 'Seller' },
    { kw: 'sale', target: 'Seller' },
    { kw: 'renter', target: 'Renter' },
    { kw: 'rent', target: 'Renter' },
    { kw: 'rental', target: 'Renter' },
    { kw: 'investor', target: 'Investor' },
    { kw: 'invest', target: 'Investor' },
    { kw: 'investment', target: 'Investor' },
  ];

  for (const item of keywords) {
    if (lower.includes(item.kw)) {
      const match = categories.find(c => c.name.toLowerCase() === item.target.toLowerCase());
      if (match) return match;
    }
  }

  return undefined;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function parseRawText(raw: string): ParsedRow[] {
  const lines = raw.trim().split('\n').filter(l => l.trim());
  const rows: ParsedRow[] = [];

  for (const line of lines) {
    const cells = line.includes('\t')
      ? line.split('\t').map(c => c.trim())
      : line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

    if (cells.length === 0 || cells.every(c => !c)) continue;

    let name = '', phone = '', area = '', propRaw = '', categoryRaw = '';

    if (cells.length === 1) {
      if (PHONE_RE.test(cells[0])) phone = cells[0];
      else name = cells[0];
    } else if (cells.length === 2) {
      if (PHONE_RE.test(cells[0])) { phone = cells[0]; name = cells[1]; }
      else { name = cells[0]; phone = cells[1]; }
    } else if (cells.length === 3) {
      name = cells[0]; phone = cells[1]; area = cells[2];
    } else if (cells.length === 4) {
      name = cells[0]; phone = cells[1]; area = cells[2]; propRaw = cells[3] || '';
    } else {
      name = cells[0]; phone = cells[1]; area = cells[2]; propRaw = cells[3] || ''; categoryRaw = cells[4] || '';
    }

    if (name && !PHONE_RE.test(phone) && PHONE_RE.test(name)) {
      [name, phone] = [phone, name];
    }

    const normPhone = normalisePhone(phone);

    rows.push({
      id: generateId(),
      name: name.trim(),
      phone: normPhone,
      area: area ? detectArea(area) : '',
      property_type: propRaw ? detectPropertyType(propRaw) : '',
      category_raw: categoryRaw.trim() || undefined,
      nameOk: name.trim().length >= 2,
      phoneOk: PHONE_RE.test(normPhone),
    });
  }

  return rows;
}

// Spintax randomizer helper
function resolveSpintax(template: string): string {
  let resolved = template;
  const spintaxRegex = /\{([^{}]+?)\}/g;
  
  let match;
  while ((match = spintaxRegex.exec(resolved)) !== null) {
    const fullMatch = match[0];
    const optionsText = match[1];
    
    if (optionsText === 'lead_name') {
      continue;
    }
    
    const options = optionsText.split('|');
    const randomOption = options[Math.floor(Math.random() * options.length)];
    resolved = resolved.replace(fullMatch, randomOption);
    spintaxRegex.lastIndex = 0;
  }
  
  return resolved;
}

function generatePreviewMessage(template: string, leadName: string): string {
  let msg = resolveSpintax(template);
  msg = msg.replace(/\{lead_name\}/g, leadName || "Client");
  return msg;
}

// ─── Create Campaign Modal ───────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const supabase = createClient();
  const [step, setStep] = useState<'paste' | 'preview'>('paste');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    message_template: '',
  });

  const [libraryTemplates, setLibraryTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  const fetchLibraryTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .order('name');
    if (data) {
      setLibraryTemplates(data as MessageTemplate[]);
    }
    setLoadingTemplates(false);
  }, [supabase]);

  useEffect(() => {
    fetchLibraryTemplates();
  }, [fetchLibraryTemplates]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMode, setCategoryMode] = useState<'apply_all' | 'auto_detect' | 'create_new'>('apply_all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  const [rawText, setRawText] = useState(() => {
    if (typeof window !== 'undefined') {
      const prefilled = sessionStorage.getItem('prefilled_campaign_leads');
      if (prefilled) {
        sessionStorage.removeItem('prefilled_campaign_leads');
        return prefilled;
      }
    }
    return '';
  });
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Only CSV files are directly supported. For Excel sheets (.xlsx), please save as CSV first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const rowsList: string[][] = [];
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        const row: string[] = [];
        let insideQuote = false;
        let entry = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            row.push(entry.trim());
            entry = '';
          } else {
            entry += char;
          }
        }
        row.push(entry.trim());
        rowsList.push(row);
      }

      if (rowsList.length === 0) {
        toast.error('The uploaded CSV file is empty.');
        return;
      }

      let startIndex = 0;
      const firstRow = rowsList[0];
      const isHeader = firstRow.some(cell => {
        const c = cell.toLowerCase();
        return c === 'name' || c === 'phone' || c === 'area' || c === 'property' || c === 'category' || c === 'full name' || c === 'mobile';
      });
      if (isHeader) {
        startIndex = 1;
      }

      const formatted = rowsList.slice(startIndex).map(row => {
        return row.map(cell => cell.replace(/^"|"$/g, '')).join(', ');
      }).join('\n');

      setRawText(formatted);
      toast.success(`Successfully loaded ${rowsList.length - startIndex} leads from CSV!${isHeader ? ' (skipped header)' : ''}`);
    };
    reader.readAsText(file);
  };

  // ============================================
  // Spintax Library Management
  // ============================================
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
      toast.error('This spintax already exists in the list.');
      return;
    }
    const newSpintaxes = [...spintaxes, spintaxToAdd];
    setSpintaxes(newSpintaxes);
    localStorage.setItem('user_spintaxes', JSON.stringify(newSpintaxes));
    toast.success('Custom spintax saved to library!');
  };

  const handleDeleteSpintax = (spintaxToDelete: string) => {
    const newSpintaxes = spintaxes.filter(s => s !== spintaxToDelete);
    setSpintaxes(newSpintaxes);
    localStorage.setItem('user_spintaxes', JSON.stringify(newSpintaxes));
    toast.success('Spintax removed from library.');
  };

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data) {
        const fetchedCats = data as Category[];
        setCategories(fetchedCats);
        const buyer = fetchedCats.find(c => c.name.toLowerCase() === 'buyer');
        if (buyer) {
          setSelectedCategoryId(buyer.id);
        } else if (fetchedCats.length > 0) {
          setSelectedCategoryId(fetchedCats[0].id);
        }
      }
    }
    fetchCategories();
  }, [supabase]);

  // Insert spintax/variable at textarea cursor
  const insertAtCursor = (textToInsert: string) => {
    const textarea = document.getElementById('message-template-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = form.message_template;
    const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
    
    setForm(p => ({ ...p, message_template: newVal }));

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 0);
  };

  const handleContinueToPreview = () => {
    if (!form.name.trim() || !form.message_template.trim()) {
      alert('Please fill out the campaign name and message template.');
      return;
    }
    if (!rawText.trim()) {
      alert('Please paste at least one lead row.');
      return;
    }
    if (categoryMode === 'create_new' && !newCategoryName.trim()) {
      alert('Please input a new category name.');
      return;
    }

    const parsed = parseRawText(rawText);
    if (parsed.length === 0) {
      alert('No valid lead rows could be parsed. Check your paste format.');
      return;
    }
    setRows(parsed);
    setStep('preview');
  };

  const regeneratePreviews = useCallback(() => {
    if (!form.message_template) return;
    
    const validRows = rows.filter(r => r.nameOk);
    const sampleName = validRows.length > 0 ? validRows[0].name : "John Doe";
    
    const generated: string[] = [];
    for (let i = 0; i < 5; i++) {
      generated.push(generatePreviewMessage(form.message_template, sampleName));
    }
    setPreviews(generated);
  }, [form.message_template, rows]);

  useEffect(() => {
    if (step === 'preview') {
      regeneratePreviews();
    }
  }, [step, regeneratePreviews]);

  const handleCreate = async () => {
    const validRows = rows.filter(r => r.nameOk && r.phoneOk);
    if (validRows.length === 0) {
      alert('There are no valid leads to import. Please make sure at least one row has a valid name and phone.');
      return;
    }

    setSaving(true);

    try {
      let targetCategoryId = selectedCategoryId;

      // 1. Create category if in 'create_new' mode
      if (categoryMode === 'create_new') {
        const trimmedName = newCategoryName.trim();
        const existing = categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
        if (existing) {
          targetCategoryId = existing.id;
        } else {
          const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          const { data: newCat, error: catErr } = await supabase
            .from('categories')
            .insert({
              name: trimmedName,
              color: randomColor,
              icon: '🏷️',
              description: 'Created during campaign setup'
            })
            .select('id')
            .single();

          if (catErr || !newCat) {
            alert(`Error creating new category: ${catErr?.message || 'Unknown error'}`);
            setSaving(false);
            return;
          }
          targetCategoryId = newCat.id;
        }
      }

      // 2. Create Campaign
      const { data: campData, error: campErr } = await supabase
        .from('campaigns')
        .insert({
          name: form.name.trim(),
          message_template: form.message_template.trim(),
          status: 'draft',
          description: null,
          message_template_ar: null,
          daily_send_limit: 33,
        })
        .select('id')
        .single();

      if (campErr || !campData) {
        alert(`Error creating campaign: ${campErr?.message || 'Unknown error'}`);
        setSaving(false);
        return;
      }

      // 3. Prepare bulk leads insertion and check for existing leads
      const phones = validRows.map(row => row.phone);
      
      const { data: existingLeads, error: fetchErr } = await supabase
        .from('leads')
        .select('id, phone')
        .in('phone', phones);

      if (fetchErr) {
        alert(`Error checking existing leads: ${fetchErr.message}`);
        setSaving(false);
        return;
      }

      const existingPhoneMap = new Map(existingLeads?.map((l: any) => [l.phone, l.id]) || []);

      // Filter out existing leads and prepare only brand new leads for insertion
      const newLeadsToInsert = validRows
        .filter(row => !existingPhoneMap.has(row.phone))
        .map(row => {
          let finalCategoryId = targetCategoryId;
          
          if (categoryMode === 'auto_detect') {
            const matched = matchCategory(row.category_raw, categories);
            if (matched) {
              finalCategoryId = matched.id;
            } else {
              finalCategoryId = categories.length > 0 ? categories[0].id : targetCategoryId;
            }
          }

          return {
            full_name: row.name,
            phone: row.phone,
            category_id: finalCategoryId || null,
            area: row.area || null,
            property_type: row.property_type || null,
            status: 'new',
            source: 'campaign_bulk',
            lead_score: 50,
          };
        });

      let allCampaignLeadIds: string[] = [];

      // Add all existing lead IDs
      existingLeads?.forEach((l: any) => {
        allCampaignLeadIds.push(l.id);
      });

      // Insert brand new leads if there are any
      if (newLeadsToInsert.length > 0) {
        const { data: insertedLeads, error: leadsErr } = await supabase
          .from('leads')
          .insert(newLeadsToInsert)
          .select('id');

        if (leadsErr || !insertedLeads) {
          alert(`Error inserting bulk leads: ${leadsErr?.message || 'Unknown error'}`);
          setSaving(false);
          return;
        }

        insertedLeads.forEach((l: { id: string }) => {
          allCampaignLeadIds.push(l.id);
        });
      }

      // 4. Link all leads (both existing and newly created) to campaign
      if (allCampaignLeadIds.length > 0) {
        const junctionRows = allCampaignLeadIds.map((leadId: string) => ({
          campaign_id: campData.id,
          lead_id: leadId,
          variant: 'A'
        }));

        const { error: linkErr } = await supabase
          .from('campaign_leads')
          .insert(junctionRows);

        if (linkErr) {
          alert(`Error associating leads to campaign: ${linkErr.message}`);
        }
      }

      onCreate();
      onClose();
    } catch (e) {
      console.error(e);
      alert('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Step 1: Compose & Paste ──────────────────────────────────────────
  if (step === 'paste') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="w-full max-w-xl bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">New Bulk Lead Campaign</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Step 1 of 2: Message Compose & Paste Leads</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Inline Save Template Modal */}
          {showSaveTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={(e) => { e.stopPropagation(); setShowSaveTemplate(false); }}>
              <div className="w-full max-w-sm bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" /> Save Template to Library
                  </h3>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowSaveTemplate(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Template Name *</Label>
                    <Input
                      placeholder="e.g. Palm Jumeirah Promo"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      className="bg-muted/30 border-border/50 h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Description</Label>
                    <Input
                      placeholder="Short notes about target"
                      value={newTemplateDesc}
                      onChange={(e) => setNewTemplateDesc(e.target.value)}
                      className="bg-muted/30 border-border/50 h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="p-3 bg-muted/10 border-t border-border/40 flex justify-end gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => setShowSaveTemplate(false)} className="text-[10px] h-7">Cancel</Button>
                  <Button
                    size="sm"
                    className="text-[10px] h-7 bg-primary text-primary-foreground font-semibold"
                    onClick={async () => {
                      if (!newTemplateName.trim()) {
                        toast.error('Template name is required.');
                        return;
                      }
                      const { error } = await supabase
                        .from('message_templates')
                        .insert({
                          name: newTemplateName.trim(),
                          description: newTemplateDesc.trim() || null,
                          content: form.message_template.trim()
                        });
                      if (error) {
                        toast.error('Failed to save template: ' + error.message);
                      } else {
                        toast.success('Template saved successfully!');
                        setShowSaveTemplate(false);
                        fetchLibraryTemplates();
                      }
                    }}
                  >
                    Save Template
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Form scroll body */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            
            {/* Campaign Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Campaign Name *</Label>
              <Input
                placeholder="e.g. Palm Jumeirah Investor Push"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Template English */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Message Template (English) *</Label>
                
                {/* Template Library Dropdown/Load & Save Actions */}
                <div className="flex items-center gap-2">
                  <select
                    className="h-7 rounded-md bg-background border border-border px-2 text-[10px] text-muted-foreground focus:outline-none focus:border-primary/50 max-w-[150px]"
                    onChange={(e) => {
                      const selected = libraryTemplates.find(t => t.id === e.target.value);
                      if (selected) {
                        setForm(p => ({ ...p, message_template: selected.content }));
                        toast.success(`Loaded template "${selected.name}"`);
                      }
                      e.target.value = ''; // Reset select
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Load from Library...</option>
                    {libraryTemplates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    onClick={() => {
                      if (!form.message_template.trim()) {
                        toast.error('Write a message template first before saving it.');
                        return;
                      }
                      setNewTemplateName('');
                      setNewTemplateDesc('');
                      setShowSaveTemplate(true);
                    }}
                    className="h-7 px-2 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 hover:border-primary/35 rounded-md font-semibold cursor-pointer"
                  >
                    💾 Save to Library
                  </Button>
                </div>
              </div>
              <Textarea
                id="message-template-textarea"
                placeholder="Hello {lead_name}! We have exciting properties in Dubai Marina..."
                className="resize-none h-28 text-sm focus-visible:ring-primary/20"
                value={form.message_template}
                onChange={e => setForm(p => ({ ...p, message_template: e.target.value }))}
              />
            </div>

            {/* Spintax Quick Badges */}
            <div className="space-y-2 p-3 bg-muted/10 rounded-xl border border-border/40">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quick Variables & Spintax Builder</span>
              </div>
              
              <div className="space-y-2.5">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-muted-foreground mr-1">Variables:</span>
                  {[
                    '{lead_name}'
                  ].map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertAtCursor(variable)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                    >
                      {variable}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-muted-foreground mr-1">Spintax:</span>
                  {spintaxes.map((spin, idx) => {
                    return (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-0.5 text-[10px] font-mono rounded-md border border-border bg-background hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all max-w-[200px] overflow-hidden"
                        title={spin}
                      >
                        <button
                          type="button"
                          onClick={() => insertAtCursor(spin)}
                          className="px-2 py-0.5 text-left truncate flex-1"
                        >
                          {spin}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSpintax(spin);
                          }}
                          className="p-0.5 hover:bg-rose-500/20 hover:text-rose-400 rounded transition-colors mr-1 shrink-0"
                          title="Delete spintax"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Spintax Creator */}
                <div className="flex items-center gap-2 pt-2.5 border-t border-border/20 mt-1">
                  <span className="text-[10px] text-muted-foreground shrink-0">Custom Spin:</span>
                  <div className="flex-1 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Excellent, Great, Superb"
                      id="custom-spintax-input"
                      className="flex-1 h-7 rounded-md bg-background border border-border px-2.5 text-[10px] focus:outline-none focus:border-primary/50 text-foreground font-sans placeholder:text-muted-foreground/45"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const btn = document.getElementById('custom-spintax-btn');
                          btn?.click();
                        }
                      }}
                    />
                    <button
                      type="button"
                      id="custom-spintax-btn"
                      onClick={() => {
                        const input = document.getElementById('custom-spintax-input') as HTMLInputElement;
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
                      Add Spintax
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Mode Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Category Options *</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'apply_all', label: '🎯 Apply to all', desc: 'Single category for all leads' },
                  { key: 'auto_detect', label: '🔍 Auto-detect', desc: 'Detect 5th column fuzzy match' },
                  { key: 'create_new', label: '✨ Create new', desc: 'Create new category on-the-fly' }
                ].map(mode => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setCategoryMode(mode.key as any)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all',
                      categoryMode === mode.key
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border bg-card hover:bg-muted/40 hover:border-border/80'
                    )}
                  >
                    <p className="text-[11px] font-semibold">{mode.label}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{mode.desc}</p>
                  </button>
                ))}
              </div>

              {/* Collapsible panel fields based on mode */}
              <div className="bg-muted/20 border border-border/60 p-3 rounded-xl">
                {categoryMode === 'apply_all' && (
                  <div className="space-y-1">
                    <Label className="text-[10px]">Select Target Category *</Label>
                    <select
                      className="w-full bg-background border border-border/80 rounded-md px-2 h-8 text-xs focus:outline-none text-foreground"
                      value={selectedCategoryId}
                      onChange={e => setSelectedCategoryId(e.target.value)}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {categoryMode === 'auto_detect' && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span>💡 5th pasted column will fuzzy-match (e.g. *Buyer, Seller, Renter*). Non-matches default to generic category.</span>
                  </div>
                )}

                {categoryMode === 'create_new' && (
                  <div className="space-y-1">
                    <Label className="text-[10px]">New Category Name *</Label>
                    <Input
                      placeholder="e.g. Luxury Penthouse Leads"
                      className="h-8 text-xs bg-background"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* File Upload Zone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Upload Leads File</Label>
              <div 
                className={cn(
                  "border border-dashed border-border/50 bg-muted/10 rounded-xl p-5 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/20 group",
                  isDragging && "border-primary bg-primary/5 border-solid"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                />
                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                <div>
                  <p className="text-sm font-medium">Drop CSV lead file here or click to browse</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Accepts .csv files (or Excel exported as CSV)</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center my-3 gap-3">
              <span className="h-[1px] bg-border/20 flex-1"></span>
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">or</span>
              <span className="h-[1px] bg-border/20 flex-1"></span>
            </div>

            {/* Bulk Leads Paste Area */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Bulk Paste Leads *</span>
                <span className="text-[10px] text-muted-foreground font-normal">Format: Name, Phone, Area, PropertyType, Category</span>
              </Label>
              <Textarea
                placeholder="John Doe, +971501234567, Dubai Marina, apartment&#10;Alice Smith, +971507654321, Palm Jumeirah, villa"
                className="font-mono text-xs h-36 resize-none"
                value={rawText}
                onChange={e => setRawText(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Tip: You can copy cells directly from Microsoft Excel or Google Sheets and paste them right here!
              </p>
            </div>

          </div>

          {/* Footer */}
          <div className="flex gap-2 p-6 border-t border-border/30 shrink-0">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={handleContinueToPreview}
              disabled={!form.name.trim() || !form.message_template.trim() || !rawText.trim()}
            >
              Continue to Preview & Verify <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 2: Review & Previews ──────────────────────────────────────────
  const validCount = rows.filter(r => r.nameOk && r.phoneOk).length;
  const totalCount = rows.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Review Campaign & Lead Import</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Step 2 of 2: Parse Review & Randomizer Preview</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scroll Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Parser Summary Stats */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-xl border border-border/50">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{validCount} / {totalCount}</p>
              <p className="text-[10px] text-muted-foreground">Valid Leads Checked</p>
            </div>
            <div className="text-center border-l border-border/50">
              <p className="text-lg font-bold text-amber-500">{totalCount - validCount}</p>
              <p className="text-[10px] text-muted-foreground">Requires Correction</p>
            </div>
          </div>

          {/* Parsed Rows Scroll Grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Leads Grid Preview ({rows.length} rows)</Label>
              <button
                type="button"
                onClick={() => setRows(prev => [...prev, {
                  id: generateId(), name: '', phone: '', area: '', property_type: '',
                  category_raw: '', nameOk: false, phoneOk: false
                }])}
                className="text-[10px] text-primary hover:underline"
              >
                + Add row manually
              </button>
            </div>
            <div className="border border-border/60 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-card">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/45 text-muted-foreground text-[10px] uppercase font-bold sticky top-0">
                  <tr>
                    <th className="p-2 w-8">Status</th>
                    <th className="p-2">Name *</th>
                    <th className="p-2">Phone *</th>
                    <th className="p-2">Area</th>
                    <th className="p-2 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rows.map(row => (
                    <tr key={row.id} className="hover:bg-muted/10">
                      {/* Check icon */}
                      <td className="p-2 text-center">
                        {row.nameOk && row.phoneOk ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 inline" />
                        )}
                      </td>
                      {/* Name input */}
                      <td className="p-1.5">
                        <input
                          type="text"
                          className={cn(
                            "w-full bg-background border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none",
                            row.nameOk ? "border-border/60" : "border-rose-400/50"
                          )}
                          value={row.name}
                          onChange={e => {
                            const val = e.target.value;
                            setRows(prev => prev.map(r => r.id === row.id ? {
                              ...r, name: val, nameOk: val.trim().length >= 2
                            } : r));
                          }}
                        />
                      </td>
                      {/* Phone input */}
                      <td className="p-1.5">
                        <input
                          type="text"
                          className={cn(
                            "w-full bg-background border rounded px-1.5 py-0.5 text-xs text-foreground font-mono focus:outline-none",
                            row.phoneOk ? "border-border/60" : "border-rose-400/50"
                          )}
                          value={row.phone}
                          onChange={e => {
                            const val = e.target.value;
                            const norm = normalisePhone(val);
                            setRows(prev => prev.map(r => r.id === row.id ? {
                              ...r, phone: val, phoneOk: PHONE_RE.test(norm)
                            } : r));
                          }}
                        />
                      </td>
                      {/* Area Select */}
                      <td className="p-1.5">
                        <select
                          className="w-full bg-background border border-border/60 rounded px-1 py-0.5 text-xs text-foreground focus:outline-none"
                          value={row.area}
                          onChange={e => {
                            const val = e.target.value;
                            setRows(prev => prev.map(r => r.id === row.id ? { ...r, area: val } : r));
                          }}
                        >
                          <option value="">— select —</option>
                          {DUBAI_AREAS.map(a => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </td>
                      {/* Trash action */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setRows(prev => prev.filter(r => r.id !== row.id))}
                          className="text-rose-400 hover:text-rose-500 hover:bg-rose-500/5 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Spintax Previews */}
          <div className="space-y-3 bg-muted/10 p-4 rounded-xl border border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ 5 Random Message Variations (Spintax Previews)</span>
              </div>
              <button
                type="button"
                onClick={regeneratePreviews}
                className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 rounded transition-all flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Regenerate
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Displays how the spintax blocks and `{'{lead_name}'}` placeholders randomize to avoid WhatsApp suspension bans.
            </p>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {previews.map((prevText, idx) => (
                <div key={idx} className="p-3 bg-background border border-border/50 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Variation #{idx + 1}</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded font-mono">Sample</span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{prevText}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 p-6 border-t border-border/30 shrink-0">
          <Button variant="outline" className="flex-1" onClick={() => setStep('paste')}>
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back to Compose
          </Button>
          <Button
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleCreate}
            disabled={saving || validCount === 0}
          >
            {saving ? 'Creating...' : `Create Campaign & Save ${validCount} Leads`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CampaignDetailModal({ campaign, onClose, onRefresh }: { campaign: Campaign; onClose: () => void; onRefresh: () => void }) {
  const supabase = createClient();
  const cfg = STATUS_CONFIG[campaign.status];

  const updateStatus = async (status: CampaignStatus) => {
    if (status === 'active') {
      // Suspend user from firing/launching if another campaign is already active and running
      const { data: activeCampaigns, error: checkError } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('status', 'active')
        .neq('id', campaign.id);

      if (checkError) {
        toast.error(`Error checking active campaigns: ${checkError.message}`);
        return;
      }

      if (activeCampaigns && activeCampaigns.length > 0) {
        toast.error(`Cannot launch campaign. Another campaign "${activeCampaigns[0].name}" is currently active and running. Please pause or complete it first.`);
        return;
      }
    }

    const { error: updateError } = await supabase.from('campaigns').update({ status }).eq('id', campaign.id);
    
    if (updateError) {
      toast.error(`Failed to update campaign status: ${updateError.message}`);
      return;
    }

    if (status === 'active') {
      try {
        // Trigger the n8n webhook via our server-side API route (to avoid CORS)
        fetch('/api/campaigns/launch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaign_id: campaign.id,
          }),
        }).then(async res => {
          if (res.ok) {
            toast.success('Campaign launched and webhook triggered successfully!');
          } else {
            const errJson = await res.json().catch(() => ({}));
            toast.error(`Campaign launched, but webhook failed: ${errJson.error || 'Unknown error'}`);
          }
        }).catch(err => {
          console.error('Error calling campaign launch API route:', err);
          toast.error('Campaign launched, but failed to connect to the server-side API route.');
        });
      } catch (err) {
        console.error('Failed to trigger n8n webhook:', err);
      }
    } else {
      toast.success(`Campaign status updated to ${status}`);
    }

    onRefresh();
    onClose();
  };

  const replyRate = campaign.total_sent > 0 ? ((campaign.total_replied / campaign.total_sent) * 100).toFixed(1) : '0';
  const readRate = campaign.total_sent > 0 ? ((campaign.total_read / campaign.total_sent) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border/50 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={cn('text-[10px]', cfg.className)}>{cfg.label}</Badge>
              <span className="text-xs text-muted-foreground">Variant {campaign.variant_label}</span>
            </div>
            <h2 className="text-base font-semibold truncate">{campaign.name}</h2>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8 ml-2 shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-muted/20 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{campaign.total_sent.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sent</p>
            </div>
            <div className="bg-blue-500/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-blue-400">{campaign.total_delivered.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Delivered</p>
            </div>
            <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-emerald-400">{readRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Read Rate</p>
            </div>
            <div className="bg-violet-500/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-violet-400">{replyRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Reply Rate</p>
            </div>
          </div>

          {/* Delivery bar */}
          <DeliveryBar sent={campaign.total_sent} delivered={campaign.total_delivered} read={campaign.total_read} replied={campaign.total_replied} />

          {/* Targeting */}
          {(campaign.target_areas.length > 0 || campaign.target_nationalities.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />Targeting</p>
              <div className="flex flex-wrap gap-1.5">
                {campaign.target_areas.map(a => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}
                {campaign.target_nationalities.map(n => <Badge key={n} variant="secondary" className="text-[10px]">{n}</Badge>)}
                {campaign.target_intents.map(i => <Badge key={i} variant="secondary" className="text-[10px] capitalize">{i}</Badge>)}
              </div>
            </div>
          )}

          {/* Template preview */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Message Template</p>
            <div className="bg-muted/20 rounded-xl p-3 text-sm text-muted-foreground border border-border/30">
              {campaign.message_template}
            </div>
            {campaign.message_template_ar && (
              <div className="bg-muted/20 rounded-xl p-3 text-sm text-muted-foreground border border-border/30 text-right" dir="rtl">
                {campaign.message_template_ar}
              </div>
            )}
          </div>

          {/* Coming Soon! Lead-by-Lead Audit */}
          <div className="relative overflow-hidden rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-transparent to-emerald-500/5 p-4 mt-2">
            {/* Ambient background glows */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-violet-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-semibold text-foreground">Lead-Level Delivery Audit</h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase bg-gradient-to-r from-violet-500 via-purple-500 to-emerald-500 text-white shadow-sm shadow-violet-900/40 animate-pulse">
                <Sparkles className="w-2.5 h-2.5 text-white animate-spin-slow" /> Coming Soon
              </span>
            </div>
            
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Get absolute visibility. Soon, you will be able to click any campaign to see the exact real-time delivery, read, and reply status for each individual lead in your list.
            </p>
            
            {/* Visual Glassmorphism Mock Preview */}
            <div className="relative rounded-xl border border-border/40 bg-background/50 overflow-hidden shadow-lg">
              {/* Mock Contacts List */}
              <div className="divide-y divide-border/20 text-xs select-none">
                {[
                  {
                    name: "Fatima Al Mansoori",
                    phone: "+971 50 284 1928",
                    area: "Palm Jumeirah",
                    status: "replied",
                    statusLabel: "Replied",
                    statusClass: "text-violet-400 bg-violet-500/10 border-violet-500/20",
                    details: "Interested in 3BR Villa"
                  },
                  {
                    name: "Zayd Al-Maktoum",
                    phone: "+971 54 991 8273",
                    area: "Dubai Marina",
                    status: "read",
                    statusLabel: "Read",
                    statusClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                    details: "Opened 2m ago"
                  },
                  {
                    name: "Sarah Jenkins",
                    phone: "+971 52 743 0011",
                    area: "Downtown Dubai",
                    status: "delivered",
                    statusLabel: "Delivered",
                    statusClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                    details: "Delivered at 14:32"
                  }
                ].map((lead, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 transition-colors duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-muted/30 border border-border/30 flex items-center justify-center text-[10px] font-bold text-muted-foreground/80">
                        {lead.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground/90">{lead.name}</p>
                          <span className="text-[9px] px-1 bg-muted/40 text-muted-foreground rounded-sm font-mono">{lead.area}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/75 font-mono">{lead.phone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border ${lead.statusClass}`}>
                          <span className={cn(
                            "w-1 h-1 rounded-full",
                            lead.status === 'replied' ? "bg-violet-400" :
                            lead.status === 'read' ? "bg-emerald-400" : "bg-blue-400"
                          )} />
                          {lead.statusLabel}
                        </span>
                        <p className="text-[8px] text-muted-foreground/60 mt-0.5">{lead.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Seamless glass overlay block */}
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-2 shadow-inner">
                  <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
                </div>
                <p className="text-[11px] font-bold bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent uppercase tracking-wider">
                  Lead Audit Sneak Peek
                </p>
                <p className="text-[10px] text-muted-foreground/90 mt-1 max-w-[280px] leading-relaxed">
                  Deep-dive analytics to see which specific contacts received and engaged with your messages.
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {campaign.description && (
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-6 shrink-0 border-t border-border/50">
          {campaign.status === 'draft' && (
            <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => updateStatus('active')}>
              <Play className="w-4 h-4 mr-2" />Launch Campaign
            </Button>
          )}
          {campaign.status === 'active' && (
            <Button variant="outline" className="flex-1" onClick={() => updateStatus('paused')}>
              <Pause className="w-4 h-4 mr-2" />Pause
            </Button>
          )}
          {campaign.status === 'paused' && (
            <Button className="flex-1" onClick={() => updateStatus('active')}>
              <Play className="w-4 h-4 mr-2" />Resume
            </Button>
          )}
          {(campaign.status === 'active' || campaign.status === 'paused') && (
            <Button variant="outline" className="flex-1" onClick={() => updateStatus('completed')}>
              <CheckCircle2 className="w-4 h-4 mr-2" />Mark Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CampaignStatus | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    setCampaigns((data as Campaign[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();

    if (typeof window !== 'undefined') {
      const prefilled = sessionStorage.getItem('prefilled_campaign_leads');
      if (prefilled) {
        setShowCreate(true);
      }
    }

    // Subscribe to campaigns real-time updates (status, sending metrics, etc.)
    const channel = supabase
      .channel('campaigns-realtime-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns' },
        () => {
          fetchCampaigns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const filtered = campaigns.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const totalSent = campaigns.reduce((s, c) => s + c.total_sent, 0);
  const totalReplied = campaigns.reduce((s, c) => s + c.total_replied, 0);
  const totalQualified = campaigns.reduce((s, c) => s + c.total_qualified, 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  const filterTabs: { key: CampaignStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'draft', label: 'Draft' },
    { key: 'paused', label: 'Paused' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">WhatsApp marketing campaigns with A/B testing</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />New Campaign
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Campaigns', value: activeCampaigns, icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total Sent', value: totalSent, icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Total Replies', value: totalReplied, icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Qualified Leads', value: totalQualified, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
                  <Icon className={cn('w-4 h-4', stat.color)} />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}
            >
              {tab.label}
              {tab.key !== 'all' && (
                <span className="ml-1.5 opacity-60">{campaigns.filter(c => c.status === tab.key).length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Cards */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border-border/50 animate-pulse">
              <CardContent className="p-5 h-28" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-16 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
            <h3 className="font-semibold mb-1">No campaigns found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? 'Try a different search term.' : 'Create your first WhatsApp campaign to get started.'}
            </p>
            {!search && (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" />Create Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(campaign => {
            const cfg = STATUS_CONFIG[campaign.status];
            const StatusIcon = cfg.icon;
            const replyRate = campaign.total_sent > 0
              ? ((campaign.total_replied / campaign.total_sent) * 100).toFixed(1)
              : '0';

            return (
              <Card
                key={campaign.id}
                className="border-border/50 hover:border-border transition-all cursor-pointer group"
                onClick={() => setSelected(campaign)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Status icon */}
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                      campaign.status === 'active' ? 'bg-emerald-500/10' :
                      campaign.status === 'paused' ? 'bg-amber-500/10' :
                      campaign.status === 'completed' ? 'bg-blue-500/10' : 'bg-muted/30'
                    )}>
                      <StatusIcon className={cn('w-5 h-5',
                        campaign.status === 'active' ? 'text-emerald-400' :
                        campaign.status === 'paused' ? 'text-amber-400' :
                        campaign.status === 'completed' ? 'text-blue-400' : 'text-muted-foreground'
                      )} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                          {campaign.name}
                        </h3>
                        <Badge variant="outline" className={cn('text-[10px] shrink-0', cfg.className)}>
                          {cfg.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                          Variant {campaign.variant_label}
                        </span>
                      </div>

                      {campaign.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{campaign.description}</p>
                      )}

                      <DeliveryBar
                        sent={campaign.total_sent}
                        delivered={campaign.total_delivered}
                        read={campaign.total_read}
                        replied={campaign.total_replied}
                      />
                    </div>

                    {/* Right stats */}
                    <div className="shrink-0 text-right space-y-1 hidden sm:block">
                      <div className="flex gap-4">
                        <StatMini label="Sent" value={campaign.total_sent} />
                        <StatMini label="Reply Rate" value={Number(replyRate)} suffix="%" />
                        <StatMini label="Qualified" value={campaign.total_qualified} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 self-center group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={fetchCampaigns} />}
      {selected && <CampaignDetailModal campaign={selected} onClose={() => setSelected(null)} onRefresh={fetchCampaigns} />}
    </div>
  );
}
