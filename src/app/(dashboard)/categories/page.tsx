'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Category, Lead, PropertyType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus, FolderKanban, X, Users, ChevronRight,
  TrendingUp, Phone, MapPin, Pencil, Trash2, Check,
  Search, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, PROPERTY_LABELS, DUBAI_AREAS } from '@/lib/constants';
import Link from 'next/link';

const PRESET_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#8b5cf6',
  '#ef4444','#06b6d4','#ec4899','#f97316',
];
const PRESET_ICONS = ['🏠','📈','🔑','💰','🏗️','🌴','🏢','⭐'];

// ─── Add / Edit Category Modal ───────────────────────────────────────────
function CategoryModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Category;
  onClose: () => void;
  onSave: () => void;
}) {
  const supabase = createClient();
  const [name, setName]         = useState(initial?.name ?? '');
  const [color, setColor]       = useState(initial?.color ?? '#10b981');
  const [icon, setIcon]         = useState(initial?.icon ?? '📁');
  const [desc, setDesc]         = useState(initial?.description ?? '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    if (initial) {
      const { error: err } = await supabase
        .from('categories')
        .update({ name, color, icon, description: desc || null })
        .eq('id', initial.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase
        .from('categories')
        .insert({ name, color, icon, description: desc || null });
      if (err) { setError(err.message); setSaving(false); return; }
    }
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm mx-4 bg-background border border-border/60 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-semibold">{initial ? 'Edit Category' : 'New Category'}</h2>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-5 space-y-4">
          {/* Icon picker */}
          <div className="space-y-2">
            <Label className="text-xs">Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_ICONS.map(i => (
                <button key={i} onClick={() => setIcon(i)}
                  className={cn('w-9 h-9 rounded-xl text-lg flex items-center justify-center border-2 transition-colors',
                    icon === i ? 'border-primary bg-primary/10' : 'border-border/40 hover:border-border')}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          {/* Color picker */}
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={cn('w-7 h-7 rounded-full border-2 transition-all', color === c ? 'border-white scale-110' : 'border-transparent')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Category Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Off-Plan Buyers" />
          </div>
          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description..." />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        {/* Preview */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-muted/10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: color + '20', border: `2px solid ${color}40` }}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold">{name || 'Category name'}</p>
              {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 p-5 pt-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Category Card ───────────────────────────────────────────────────────
function CategoryCard({
  category,
  leads,
  onEdit,
  onDelete,
  onViewLeads,
}: {
  category: Category;
  leads: Lead[];
  onEdit: () => void;
  onDelete: () => void;
  onViewLeads: () => void;
}) {
  const preview = leads.slice(0, 4);

  return (
    <Card className="border-border/50 overflow-hidden group">
      {/* Color stripe */}
      <div className="h-1 w-full" style={{ backgroundColor: category.color }} />
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between">
          {/* Header click triggers viewer window */}
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity" onClick={onViewLeads}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: category.color + '18', border: `1.5px solid ${category.color}30` }}>
              {category.icon}
            </div>
            <div>
              <CardTitle className="text-base group-hover:text-primary transition-colors">{category.name}</CardTitle>
              {category.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-destructive" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats - Leads count click triggers viewer window */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors" onClick={onViewLeads}>
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-2xl font-bold">{leads.length}</span>
            <span className="text-sm text-muted-foreground">leads</span>
          </div>
          {leads.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              avg score {Math.round(leads.reduce((s, l) => s + l.lead_score, 0) / leads.length)}
            </div>
          )}
        </div>
      </CardHeader>

      {leads.length > 0 && (
        <CardContent className="pt-0 pb-4">
          <div className="space-y-1.5">
            {preview.map(lead => {
              const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
              return (
                <Link key={lead.id} href={`/leads/${lead.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors group/row">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: category.color }}>
                      {lead.nationality_flag || lead.full_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover/row:text-primary transition-colors">{lead.full_name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Phone className="w-2.5 h-2.5" />{lead.phone}
                        {lead.area && <><MapPin className="w-2.5 h-2.5 ml-1" />{lead.area}</>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-bold text-muted-foreground">{lead.lead_score}</span>
                    <Badge variant="outline" className={cn('text-[9px] py-0', sc.className)}>{sc.label}</Badge>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                  </div>
                </Link>
              );
            })}
          </div>

          {leads.length > 4 && (
            <button
              onClick={onViewLeads}
              className="w-full mt-2 text-xs text-muted-foreground hover:text-primary transition-colors text-center py-1.5 font-medium">
              + {leads.length - 4} more leads (View all)
            </button>
          )}
        </CardContent>
      )}

      {leads.length === 0 && (
        <CardContent className="pt-0 pb-5">
          <div className="text-center py-4 text-muted-foreground/40">
            <Users className="w-6 h-6 mx-auto mb-1" />
            <p className="text-xs">No leads yet</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Category Leads Management Modal Window ──────────────────────────────
function CategoryLeadsModal({
  category,
  leads,
  onClose,
  onRefresh,
}: {
  category: Category;
  leads: Lead[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const supabase = createClient();
  const [search, setSearch] = useState('');
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

  // Lead inline edit state variables
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editPropertyType, setEditPropertyType] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editScore, setEditScore] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  const startEdit = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setEditName(lead.full_name);
    setEditPhone(lead.phone);
    setEditArea(lead.area || '');
    setEditPropertyType(lead.property_type || '');
    setEditStatus(lead.status);
    setEditScore(lead.lead_score);
  };

  const cancelEdit = () => {
    setEditingLeadId(null);
  };

  const saveEdit = async (leadId: string) => {
    if (!editName.trim()) return;
    setUpdating(true);
    const { error } = await supabase
      .from('leads')
      .update({
        full_name: editName.trim(),
        phone: editPhone.trim(),
        area: editArea.trim() || null,
        property_type: editPropertyType || null,
        status: editStatus,
        lead_score: editScore,
      })
      .eq('id', leadId);

    if (error) {
      alert(`Error updating lead: ${error.message}`);
    } else {
      setEditingLeadId(null);
      onRefresh();
    }
    setUpdating(false);
  };

  const deleteLead = async (lead: Lead) => {
    if (!confirm(`Are you sure you want to delete lead "${lead.full_name}"? This action cannot be undone.`)) return;
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', lead.id);

    if (error) {
      alert(`Error deleting lead: ${error.message}`);
    } else {
      onRefresh();
    }
  };

  // Search filter
  const filteredLeads = leads.filter(lead => {
    const term = search.toLowerCase();
    return (
      lead.full_name.toLowerCase().includes(term) ||
      lead.phone.toLowerCase().includes(term) ||
      (lead.area && lead.area.toLowerCase().includes(term))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{
                backgroundColor: category.color + '18',
                border: `1.5px solid ${category.color}30`,
              }}
            >
              {category.icon}
            </div>
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                {category.name} Leads
                <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                  {leads.length} total
                </Badge>
              </h2>
              {category.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 bg-muted/10 border-b border-border/30 shrink-0 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads in this category by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-background border-border/50 h-9 text-xs"
            />
          </div>
        </div>

        {/* Leads Table Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground/60">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No leads found</p>
              <p className="text-xs">Try searching for something else or add leads to this category</p>
            </div>
          ) : (
            <div className="border border-border/40 rounded-xl overflow-hidden bg-muted/5">
              {/* Table Header */}
              <div className="grid grid-cols-[50px_2.2fr_1.8fr_1.5fr_1.8fr_1fr_1.2fr_100px] gap-2 px-4 py-2.5 bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 shrink-0">
                <span>Score</span>
                <span>Name</span>
                <span>Phone</span>
                <span>Area</span>
                <span>Property</span>
                <span>Status</span>
                <span />
                <span className="text-right pr-2">Actions</span>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-border/30">
                {filteredLeads.map(lead => {
                  const isEditing = editingLeadId === lead.id;
                  const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;

                  return (
                    <div
                      key={lead.id}
                      className={cn(
                        "grid grid-cols-[50px_2.2fr_1.8fr_1.5fr_1.8fr_1fr_1.2fr_100px] gap-2 items-center px-4 py-3 text-sm transition-colors",
                        isEditing ? "bg-primary/5 hover:bg-primary/5" : "hover:bg-muted/10"
                      )}
                    >
                      {/* Score */}
                      <div>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-12 bg-background border border-border rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:border-primary"
                            value={editScore}
                            onChange={e => setEditScore(Number(e.target.value))}
                          />
                        ) : (
                          <Badge
                            variant="secondary"
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs p-0 bg-background border shadow-sm"
                            style={{
                              borderColor: lead.lead_score >= 80 ? '#f43f5e' : lead.lead_score >= 50 ? '#fbbf24' : '#94a3b8',
                              color: lead.lead_score >= 80 ? '#f43f5e' : lead.lead_score >= 50 ? '#fbbf24' : '#64748b'
                            }}
                          >
                            {lead.lead_score}
                          </Badge>
                        )}
                      </div>

                      {/* Name */}
                      <div className="min-w-0 pr-2">
                        {isEditing ? (
                          <input
                            type="text"
                            className="w-full bg-background border border-border rounded px-2 py-0.5 text-xs focus:outline-none focus:border-primary font-medium"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs shrink-0">{lead.nationality_flag || '👤'}</span>
                            <span className="font-semibold truncate text-foreground">{lead.full_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="min-w-0 pr-2">
                        {isEditing ? (
                          <input
                            type="text"
                            className="w-full bg-background border border-border rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-primary"
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                          />
                        ) : (
                          <span className="text-xs font-mono text-muted-foreground truncate block">{lead.phone}</span>
                        )}
                      </div>

                      {/* Area */}
                      <div className="min-w-0 pr-2">
                        {isEditing ? (
                          <select
                            className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-primary"
                            value={editArea}
                            onChange={e => setEditArea(e.target.value)}
                          >
                            <option value="">— select —</option>
                            {DUBAI_AREAS.map(a => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground truncate block">{lead.area || '—'}</span>
                        )}
                      </div>

                      {/* Property Type */}
                      <div className="min-w-0 pr-2">
                        {isEditing ? (
                          <select
                            className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-primary"
                            value={editPropertyType}
                            onChange={e => setEditPropertyType(e.target.value)}
                          >
                            <option value="">— select —</option>
                            {Object.entries(PROPERTY_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground truncate block">
                            {PROPERTY_LABELS[lead.property_type as PropertyType] || lead.property_type || '—'}
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        {isEditing ? (
                          <select
                            className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-primary"
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value)}
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="outline" className={cn('text-[9px] py-0 shrink-0 font-medium', sc.className)}>
                            {sc.label}
                          </Badge>
                        )}
                      </div>

                      {/* Detail Link */}
                      <div>
                        {!isEditing && (
                          <Link
                            href={`/leads/${lead.id}`}
                            className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5 shrink-0"
                          >
                            Profile <ChevronRight className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(lead.id)}
                              disabled={updating}
                              className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white shadow-sm transition-colors"
                              title="Save changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="w-7 h-7 rounded-lg bg-muted hover:bg-muted-foreground/20 flex items-center justify-center text-muted-foreground transition-colors"
                              title="Cancel editing"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(lead)}
                              className="w-7 h-7 rounded-lg hover:bg-muted/80 border border-transparent hover:border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                              title="Edit lead"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteLead(lead)}
                              className="w-7 h-7 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 flex items-center justify-center text-muted-foreground hover:text-rose-500 transition-all"
                              title="Delete lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-muted/5 shrink-0 flex justify-end">
          <Button onClick={onClose}>Close Window</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [editing, setEditing]       = useState<Category | null>(null);

  // Selected Category Leads popup window state
  const [activeCategoryLeads, setActiveCategoryLeads] = useState<Category | null>(null);

  const fetchAll = async () => {
    const [{ data: cats }, { data: ls }] = await Promise.all([
      supabase.from('categories').select('*').order('created_at'),
      supabase.from('leads').select('id,full_name,phone,area,property_type,lead_score,status,nationality_flag,category_id').order('lead_score', { ascending: false }),
    ]);
    setCategories((cats as Category[]) || []);
    setLeads((ls as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"? Leads will become uncategorised.`)) return;
    await supabase.from('leads').update({ category_id: null }).eq('category_id', cat.id);
    await supabase.from('categories').delete().eq('id', cat.id);
    fetchAll();
  };

  const leadsForCategory = (catId: string) => leads.filter(l => l.category_id === catId);
  const uncategorised = leads.filter(l => !l.category_id);

  const totalCategorised = leads.filter(l => l.category_id).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organise leads by intent — {categories.length} categories · {totalCategorised} categorised
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />New Category
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/50 animate-pulse"><CardContent className="h-16 p-4" /></Card>
          ))
        ) : (
          categories.map(cat => (
            <Card
              key={cat.id}
              className="border-border/50 hover:border-border/80 hover:bg-muted/5 transition-all cursor-pointer shadow-sm"
              onClick={() => setActiveCategoryLeads(cat)}
            >
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                  {cat.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate font-medium">{cat.name}</p>
                  <p className="text-xl font-bold leading-none mt-0.5">{leadsForCategory(cat.id).length}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Category cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="border-border/50 animate-pulse"><CardContent className="h-48 p-5" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(cat => (
            <div key={cat.id}>
              <CategoryCard
                category={cat}
                leads={leadsForCategory(cat.id)}
                onEdit={() => setEditing(cat)}
                onDelete={() => handleDelete(cat)}
                onViewLeads={() => setActiveCategoryLeads(cat)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Uncategorised */}
      {!loading && uncategorised.length > 0 && (
        <Card className="border-border/50 border-dashed">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center text-lg">📋</div>
              <div>
                <CardTitle className="text-base text-muted-foreground">Uncategorised</CardTitle>
                <p className="text-xs text-muted-foreground">{uncategorised.length} leads without a category</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {uncategorised.slice(0, 5).map(lead => (
                <Link key={lead.id} href={`/leads/${lead.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-muted/40 flex items-center justify-center text-xs font-bold shrink-0">
                      {lead.full_name[0]}
                    </div>
                    <p className="text-sm font-medium truncate">{lead.full_name}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-[9px]', (STATUS_CONFIG[lead.status] || STATUS_CONFIG.new).className)}>
                    {(STATUS_CONFIG[lead.status] || STATUS_CONFIG.new).label}
                  </Badge>
                </Link>
              ))}
              {uncategorised.length > 5 && (
                <p className="text-xs text-center text-muted-foreground pt-1">+ {uncategorised.length - 5} more</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {showAdd && <CategoryModal onClose={() => setShowAdd(false)} onSave={fetchAll} />}
      {editing && <CategoryModal initial={editing} onClose={() => setEditing(null)} onSave={fetchAll} />}
      {activeCategoryLeads && (
        <CategoryLeadsModal
          category={activeCategoryLeads}
          leads={leads.filter(l => l.category_id === activeCategoryLeads.id)}
          onClose={() => setActiveCategoryLeads(null)}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}
