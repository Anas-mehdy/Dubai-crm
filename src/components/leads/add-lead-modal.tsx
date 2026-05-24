'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X, ClipboardPaste, CheckCircle2, AlertCircle,
  Loader2, ChevronRight, RotateCcw, Upload,
  User, Phone, MapPin, Building2, Trash2, Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROPERTY_LABELS } from '@/lib/constants';
import type { PropertyType } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────────────────
interface ParsedRow {
  id: string;
  name: string;
  phone: string;
  area: string;
  property_type: string;
  category_raw?: string;
  // validation
  nameOk: boolean;
  phoneOk: boolean;
  duplicate?: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
}

type Step = 'paste' | 'preview' | 'importing' | 'done';

// ─── Helpers ─────────────────────────────────────────────────────────────
const PHONE_RE   = /^\+?[\d\s\-().]{7,20}$/;
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
  // return the original value capitalised if no match
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

  // 1. Case-insensitive exact name matching
  const exactMatch = categories.find(c => c.name.toLowerCase() === lower);
  if (exactMatch) return exactMatch;

  // 2. Keyword check fallback
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

/**
 * Parses raw pasted text.
 * Supports: tab-separated (Excel copy), comma-separated, or one row per line.
 * Column order heuristic: name, phone, area, property_type, category_raw
 * If a single column looks like a phone number, it's treated as phone.
 */
function parseRawText(raw: string): ParsedRow[] {
  const lines = raw.trim().split('\n').filter(l => l.trim());
  const rows: ParsedRow[] = [];

  for (const line of lines) {
    // Try tab first (Excel default), then comma
    const cells = line.includes('\t')
      ? line.split('\t').map(c => c.trim())
      : line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

    if (cells.length === 0 || cells.every(c => !c)) continue;

    // ── Detect columns ──────────────────────────────────────────────────
    let name = '', phone = '', area = '', propRaw = '', categoryRaw = '';

    if (cells.length === 1) {
      // Single cell — could be phone only or name
      if (PHONE_RE.test(cells[0])) phone = cells[0];
      else name = cells[0];
    } else if (cells.length === 2) {
      // Two cells — name + phone or phone + name
      if (PHONE_RE.test(cells[0])) { phone = cells[0]; name = cells[1]; }
      else { name = cells[0]; phone = cells[1]; }
    } else if (cells.length === 3) {
      name = cells[0]; phone = cells[1]; area = cells[2];
    } else if (cells.length === 4) {
      name = cells[0]; phone = cells[1]; area = cells[2]; propRaw = cells[3] || '';
    } else {
      // 5+ columns: name, phone, area, property_type, category_raw (ignore extras)
      name = cells[0]; phone = cells[1]; area = cells[2]; propRaw = cells[3] || ''; categoryRaw = cells[4] || '';
    }

    // Swap name/phone if phone column looks like a name
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

// ─── Sub-components ───────────────────────────────────────────────────────

function FieldIcon({ ok, empty }: { ok: boolean; empty?: boolean }) {
  if (empty) return <span className="w-4 h-4 rounded-full border border-border/40 inline-block" />;
  return ok
    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
}

// ─── Main Modal ───────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  onImported: () => void;
}

export function AddLeadModal({ onClose, onImported }: Props) {
  const supabase = createClient();

  const [step, setStep] = useState<Step>('paste');
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Category Assignment States
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMode, setCategoryMode] = useState<'apply_all' | 'auto_detect' | 'create_new'>('apply_all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (!error && data) {
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

  // ── Parse step ─────────────────────────────────────────────────────────
  const handleParse = useCallback(() => {
    if (!rawText.trim()) return;
    const parsed = parseRawText(rawText);
    setRows(parsed);
    setStep('preview');
  }, [rawText]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    setRawText(text);
    // Auto-parse after paste
    setTimeout(() => {
      const parsed = parseRawText(text);
      setRows(parsed);
      setStep('preview');
    }, 50);
  }, []);

  // ── Row editing ─────────────────────────────────────────────────────────
  const updateRow = (id: string, field: keyof ParsedRow, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'name')  updated.nameOk  = value.trim().length >= 2;
      if (field === 'phone') updated.phoneOk = PHONE_RE.test(normalisePhone(value));
      if (field === 'phone') updated.phone   = normalisePhone(value);
      return updated;
    }));
  };

  const deleteRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  const addBlankRow = () => setRows(prev => [...prev, {
    id: generateId(), name: '', phone: '', area: '', property_type: '',
    category_raw: '',
    nameOk: false, phoneOk: false,
  }]);

  // ── Import step ─────────────────────────────────────────────────────────
  const handleImport = async () => {
    const valid = rows.filter(r => r.nameOk && r.phoneOk);
    if (valid.length === 0) return;

    setStep('importing');
    setImportProgress(0);
    const errs: string[] = [];
    let ok = 0;

    let targetCategoryId = selectedCategoryId;

    // Handle "create new" category mode
    if (categoryMode === 'create_new') {
      const trimmedName = newCategoryName.trim();
      if (trimmedName) {
        // Double-check if the category already exists by case-insensitive name match
        const existing = categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
        if (existing) {
          targetCategoryId = existing.id;
        } else {
          const { data: newCat, error: catErr } = await supabase
            .from('categories')
            .insert({
              name: trimmedName,
              color: '#3b82f6', // beautiful default primary blue color
              icon: '🏷️',       // classic premium label icon
            })
            .select()
            .single();

          if (catErr) {
            errs.push(`Failed to create category "${trimmedName}": ${catErr.message}`);
          } else if (newCat) {
            targetCategoryId = newCat.id;
            setCategories(prev => [...prev, newCat]);
          }
        }
      }
    }

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      let rowCategoryId: string | null = null;

      if (categoryMode === 'apply_all') {
        rowCategoryId = selectedCategoryId || null;
      } else if (categoryMode === 'create_new') {
        rowCategoryId = targetCategoryId || null;
      } else if (categoryMode === 'auto_detect') {
        const matched = matchCategory(row.category_raw, categories);
        rowCategoryId = matched ? matched.id : null;
      }

      const { error } = await supabase.from('leads').insert({
        full_name:     row.name,
        phone:         row.phone,
        area:          row.area || null,
        property_type: (row.property_type as PropertyType) || null,
        status:        'new',
        source:        'manual_import',
        category_id:   rowCategoryId,
      });

      if (error) {
        if (error.code === '23505') { // unique violation
          errs.push(`${row.name} (${row.phone}) — duplicate phone, skipped`);
        } else {
          errs.push(`${row.name} — ${error.message}`);
        }
      } else {
        ok++;
      }

      setImportProgress(Math.round(((i + 1) / valid.length) * 100));
    }

    setImportedCount(ok);
    setErrors(errs);
    setStep('done');
    onImported();
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const validCount   = rows.filter(r => r.nameOk && r.phoneOk).length;
  const invalidCount = rows.filter(r => !r.nameOk || !r.phoneOk).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Add Leads</h2>
              <p className="text-xs text-muted-foreground">
                {step === 'paste' && 'Paste from Excel or type manually'}
                {step === 'preview' && `${rows.length} rows detected — review before importing`}
                {step === 'importing' && `Importing… ${importProgress}%`}
                {step === 'done' && `${importedCount} leads imported successfully`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step indicators */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              {(['paste', 'preview', 'done'] as const).map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                    step === s ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground'
                  )}>{i + 1}</span>
                  <span className={step === s ? 'text-foreground' : 'text-muted-foreground'}>
                    {s === 'paste' ? 'Paste' : s === 'preview' ? 'Review' : 'Done'}
                  </span>
                  {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </span>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* STEP 1: PASTE */}
          {step === 'paste' && (
            <div className="p-5 space-y-4">
              {/* Format hint */}
              <div className="bg-muted/20 border border-border/40 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Format</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { icon: User,     label: 'Name',     eg: 'Mohammed Al Rashidi' },
                    { icon: Phone,    label: 'Phone',    eg: '+971 50 123 4567' },
                    { icon: MapPin,   label: 'Area',     eg: 'Dubai Marina' },
                    { icon: Building2,label: 'Property', eg: 'Apartment' },
                    { icon: Tag,      label: 'Category', eg: 'Buyer (Optional)' },
                  ].map(f => (
                    <div key={f.label} className="bg-background/50 rounded-lg p-2 border border-border/30 overflow-hidden">
                      <div className="flex items-center gap-1 mb-1">
                        <f.icon className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-[10px] font-semibold text-primary truncate">{f.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{f.eg}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  💡 Copy directly from Excel (Ctrl+C) — the system detects tabs, commas, or line breaks automatically.
                  Area, property, and category are auto-matched. Phone numbers are normalised to E.164.
                </p>
              </div>

              {/* Paste area */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  onPaste={handlePaste}
                  placeholder={`Paste your leads here…\n\nExample:\nMohammed Al Rashidi\t+971501234001\tDowntown Dubai\tPenthouse\tBuyer\nPriya Sharma\t+971502234002\tDubai Marina\tApartment\tRenter`}
                  className="w-full h-52 bg-muted/20 border border-border/50 rounded-xl p-4 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/50 transition-colors"
                  spellCheck={false}
                />
                {!rawText && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center gap-2 mt-10">
                      <ClipboardPaste className="w-10 h-10 text-muted-foreground/20" />
                      <span className="text-sm text-muted-foreground/40">Ctrl+V / ⌘V to paste</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleParse} disabled={!rawText.trim()}>
                  Parse & Preview
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" onClick={addBlankRow}>
                  + Add single lead
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW TABLE */}
          {step === 'preview' && (
            <div className="flex flex-col h-full">
              {/* Stats bar */}
              <div className="px-5 pt-4 pb-3 flex items-center gap-4 shrink-0 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">{validCount} valid</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-sm font-medium text-rose-400">{invalidCount} need review</span>
                  </div>
                )}
                <Button variant="ghost" size="sm" className="ml-auto gap-1.5 text-xs" onClick={() => { setStep('paste'); setRows([]); }}>
                  <RotateCcw className="w-3 h-3" /> Re-paste
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addBlankRow}>
                  + Add row
                </Button>
              </div>

              {/* Category Configuration Panel */}
              <div className="px-5 py-4 bg-muted/10 border-b border-border/30 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" /> Category Assignment
                  </span>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Organise imported leads by assigning a segment category
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Mode: Apply to All */}
                  <div
                    onClick={() => setCategoryMode('apply_all')}
                    className={cn(
                      'relative flex flex-col p-3 rounded-xl border border-border/40 cursor-pointer transition-all duration-200 hover:border-primary/40 bg-background/30 hover:bg-background/50',
                      categoryMode === 'apply_all' && 'border-primary/60 bg-primary/5 shadow-sm'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <input
                        type="radio"
                        name="categoryMode"
                        value="apply_all"
                        checked={categoryMode === 'apply_all'}
                        onChange={() => setCategoryMode('apply_all')}
                        className="accent-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold flex items-center gap-1">🎯 Apply to all</span>
                    </div>
                    {categoryMode === 'apply_all' ? (
                      <div className="mt-1" onClick={e => e.stopPropagation()}>
                        <select
                          className="w-full text-xs bg-background border border-border rounded-lg p-1.5 focus:outline-none focus:border-primary/50 text-foreground cursor-pointer"
                          value={selectedCategoryId}
                          onChange={e => setSelectedCategoryId(e.target.value)}
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.icon} {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground pl-6">
                        Assign one category to all imported leads.
                      </span>
                    )}
                  </div>

                  {/* Mode: Auto Detect */}
                  <div
                    onClick={() => setCategoryMode('auto_detect')}
                    className={cn(
                      'relative flex flex-col p-3 rounded-xl border border-border/40 cursor-pointer transition-all duration-200 hover:border-primary/40 bg-background/30 hover:bg-background/50',
                      categoryMode === 'auto_detect' && 'border-primary/60 bg-primary/5 shadow-sm'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <input
                        type="radio"
                        name="categoryMode"
                        value="auto_detect"
                        checked={categoryMode === 'auto_detect'}
                        onChange={() => setCategoryMode('auto_detect')}
                        className="accent-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold flex items-center gap-1">🔍 Auto-detect</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground pl-6">
                      Fuzzy-matches 5th pasted column by name or intents (buy/sell/rent/invest keywords).
                    </span>
                  </div>

                  {/* Mode: Create New */}
                  <div
                    onClick={() => setCategoryMode('create_new')}
                    className={cn(
                      'relative flex flex-col p-3 rounded-xl border border-border/40 cursor-pointer transition-all duration-200 hover:border-primary/40 bg-background/30 hover:bg-background/50',
                      categoryMode === 'create_new' && 'border-primary/60 bg-primary/5 shadow-sm'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <input
                        type="radio"
                        name="categoryMode"
                        value="create_new"
                        checked={categoryMode === 'create_new'}
                        onChange={() => setCategoryMode('create_new')}
                        className="accent-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold flex items-center gap-1">✨ Create new</span>
                    </div>
                    {categoryMode === 'create_new' ? (
                      <div className="mt-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          className="w-full text-xs bg-background border border-border rounded-lg p-1.5 focus:outline-none focus:border-primary/50 text-foreground"
                          placeholder="e.g. VIP Luxury"
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                        />
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground pl-6">
                        Create a brand-new category and assign all leads to it.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Column headers */}
              <div className={cn(
                "grid gap-2 px-5 py-2 bg-muted/10 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0",
                categoryMode === 'auto_detect'
                  ? "grid-cols-[28px_1fr_1.1fr_0.9fr_0.9fr_1fr_28px]"
                  : "grid-cols-[28px_1fr_1fr_1fr_1fr_28px]"
              )}>
                <span />
                <span className="flex items-center gap-1"><User className="w-3 h-3" />Name</span>
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />Phone</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Area</span>
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />Property</span>
                {categoryMode === 'auto_detect' && (
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" />Category</span>
                )}
                <span />
              </div>

              {/* Rows */}
              <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1.5">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className={cn(
                      'grid gap-2 items-center px-2 py-1.5 rounded-lg border transition-colors',
                      categoryMode === 'auto_detect'
                        ? 'grid-cols-[28px_1fr_1.1fr_0.9fr_0.9fr_1fr_28px]'
                        : 'grid-cols-[28px_1fr_1fr_1fr_1fr_28px]',
                      row.nameOk && row.phoneOk
                        ? 'border-border/20 hover:border-border/40'
                        : 'border-rose-500/20 bg-rose-500/5'
                    )}
                  >
                    {/* Validity indicator */}
                    <FieldIcon ok={row.nameOk && row.phoneOk} />

                    {/* Name */}
                    <input
                      className={cn(
                        'bg-transparent text-sm w-full focus:outline-none border-b border-transparent focus:border-primary/40 transition-colors py-0.5',
                        !row.nameOk && 'text-rose-400'
                      )}
                      value={row.name}
                      onChange={e => updateRow(row.id, 'name', e.target.value)}
                      placeholder="Full name"
                    />

                    {/* Phone */}
                    <input
                      className={cn(
                        'bg-transparent text-sm font-mono w-full focus:outline-none border-b border-transparent focus:border-primary/40 transition-colors py-0.5',
                        !row.phoneOk && 'text-rose-400'
                      )}
                      value={row.phone}
                      onChange={e => updateRow(row.id, 'phone', e.target.value)}
                      placeholder="+971..."
                    />

                    {/* Area */}
                    <input
                      className="bg-transparent text-sm w-full focus:outline-none border-b border-transparent focus:border-primary/40 transition-colors py-0.5 text-muted-foreground"
                      value={row.area}
                      onChange={e => updateRow(row.id, 'area', e.target.value)}
                      placeholder="Area"
                    />

                    {/* Property type */}
                    <select
                      className="bg-transparent text-sm w-full focus:outline-none text-muted-foreground py-0.5 cursor-pointer"
                      value={row.property_type}
                      onChange={e => updateRow(row.id, 'property_type', e.target.value)}
                    >
                      <option value="">— type —</option>
                      {Object.entries(PROPERTY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>

                    {/* Category preview (Auto Detect mode) */}
                    {categoryMode === 'auto_detect' && (
                      <div className="relative flex items-center w-full min-w-0">
                        <input
                          className="bg-transparent text-xs w-full focus:outline-none border-b border-transparent focus:border-primary/40 transition-colors py-0.5 text-muted-foreground pr-6 truncate"
                          value={row.category_raw || ''}
                          onChange={e => updateRow(row.id, 'category_raw', e.target.value)}
                          placeholder="Category..."
                        />
                        {(() => {
                          const matched = matchCategory(row.category_raw, categories);
                          return (
                            <span
                              className="absolute right-1 text-xs shrink-0 select-none"
                              title={matched ? `Matched: ${matched.name}` : 'Unmatched'}
                            >
                              {matched ? matched.icon : '❓'}
                            </span>
                          );
                        })()}
                      </div>
                    )}

                    {/* Delete */}
                    <button onClick={() => deleteRow(row.id)} className="text-muted-foreground/40 hover:text-rose-400 transition-colors justify-self-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: IMPORTING */}
          {step === 'importing' && (
            <div className="p-8 flex flex-col items-center justify-center gap-5 min-h-[200px]">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="w-full max-w-xs">
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground mt-2">{importProgress}% complete</p>
              </div>
            </div>
          )}

          {/* STEP 4: DONE */}
          {step === 'done' && (
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{importedCount} leads imported</p>
                  <p className="text-sm text-muted-foreground">They are now in your Lead Priority Queue</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">
                    ✓ {importedCount} added
                  </Badge>
                  {errors.length > 0 && (
                    <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 border">
                      ✗ {errors.length} skipped
                    </Badge>
                  )}
                </div>
              </div>

              {errors.length > 0 && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-semibold text-rose-400 mb-2">Skipped rows:</p>
                  {errors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-5 border-t border-border/50 shrink-0 flex gap-2">
          {step === 'paste' && (
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                onClick={handleImport}
                disabled={validCount === 0 || (categoryMode === 'create_new' && !newCategoryName.trim())}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import {validCount} Lead{validCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {step === 'done' && (
            <>
              <Button variant="outline" className="flex-1" onClick={() => { setStep('paste'); setRawText(''); setRows([]); }}>
                <RotateCcw className="w-4 h-4 mr-2" />Import More
              </Button>
              <Button className="flex-1" onClick={onClose}>Done</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
