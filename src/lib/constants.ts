// ============================================
// Dubai CRM Constants
// ============================================

import type { LeadScoreColor } from './types';

// Dubai real estate areas
export const DUBAI_AREAS = [
  'Dubai Marina',
  'Palm Jumeirah',
  'Downtown Dubai',
  'Business Bay',
  'JBR',
  'DIFC',
  'Dubai Hills Estate',
  'Arabian Ranches',
  'Jumeirah Village Circle',
  'Dubai Creek Harbour',
  'Bluewaters Island',
  'City Walk',
  'Meydan',
  'Al Barsha',
  'Jumeirah',
  'Deira',
  'Dubai Silicon Oasis',
  'Motor City',
  'Sports City',
  'Dubai South',
  'MBR City',
  'Damac Hills',
  'Emirates Hills',
  'Al Furjan',
  'Discovery Gardens',
] as const;

// Common nationalities in Dubai real estate
export const NATIONALITIES = [
  { code: 'AE', name: 'Emirati', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi', flag: '🇸🇦' },
  { code: 'KW', name: 'Kuwaiti', flag: '🇰🇼' },
  { code: 'QA', name: 'Qatari', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahraini', flag: '🇧🇭' },
  { code: 'OM', name: 'Omani', flag: '🇴🇲' },
  { code: 'IN', name: 'Indian', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistani', flag: '🇵🇰' },
  { code: 'GB', name: 'British', flag: '🇬🇧' },
  { code: 'RU', name: 'Russian', flag: '🇷🇺' },
  { code: 'CN', name: 'Chinese', flag: '🇨🇳' },
  { code: 'DE', name: 'German', flag: '🇩🇪' },
  { code: 'FR', name: 'French', flag: '🇫🇷' },
  { code: 'US', name: 'American', flag: '🇺🇸' },
  { code: 'EG', name: 'Egyptian', flag: '🇪🇬' },
  { code: 'JO', name: 'Jordanian', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanese', flag: '🇱🇧' },
  { code: 'IQ', name: 'Iraqi', flag: '🇮🇶' },
  { code: 'IR', name: 'Iranian', flag: '🇮🇷' },
  { code: 'NG', name: 'Nigerian', flag: '🇳🇬' },
  { code: 'ZA', name: 'South African', flag: '🇿🇦' },
  { code: 'CA', name: 'Canadian', flag: '🇨🇦' },
  { code: 'AU', name: 'Australian', flag: '🇦🇺' },
  { code: 'IT', name: 'Italian', flag: '🇮🇹' },
] as const;

// Budget tier labels
export const BUDGET_LABELS: Record<string, string> = {
  under_1m: 'Under 1M AED',
  '1m_3m': '1M – 3M AED',
  '3m_5m': '3M – 5M AED',
  '5m_10m': '5M – 10M AED',
  '10m_plus': '10M+ AED',
};

// Property type labels
export const PROPERTY_LABELS: Record<string, string> = {
  apartment: 'Apartment',
  villa: 'Villa',
  townhouse: 'Townhouse',
  penthouse: 'Penthouse',
  plot: 'Plot',
  commercial: 'Commercial',
  off_plan: 'Off-Plan',
};

// Lead status labels & colors
export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  contacted: { label: 'Contacted', className: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  qualifying: { label: 'Qualifying', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  qualified: { label: 'Qualified', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  hot: { label: '🔥 HOT', className: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' },
  converted: { label: 'Converted', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  lost: { label: 'Lost', className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  dormant: { label: 'Dormant', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
};

// Lead intent labels
export const INTENT_LABELS: Record<string, string> = {
  buy: '🏠 Buy',
  sell: '💰 Sell',
  rent: '🔑 Rent',
  invest: '📈 Invest',
};

// Client type labels
export const CLIENT_TYPE_LABELS: Record<string, string> = {
  investor: 'Investor',
  end_user: 'End User',
  developer_client: 'Developer',
  corporate: 'Corporate',
};

// Score color ranges
export function getScoreColor(score: number): LeadScoreColor {
  if (score >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-400', ring: 'stroke-emerald-500', label: 'Hot' };
  if (score >= 60) return { bg: 'bg-amber-500', text: 'text-amber-400', ring: 'stroke-amber-500', label: 'Warm' };
  if (score >= 40) return { bg: 'bg-blue-500', text: 'text-blue-400', ring: 'stroke-blue-500', label: 'Cool' };
  return { bg: 'bg-slate-500', text: 'text-slate-400', ring: 'stroke-slate-500', label: 'Cold' };
}

// Navigation items
export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Leads', href: '/leads', icon: 'Users' },
  { label: 'Campaigns', href: '/campaigns', icon: 'Megaphone' },
  { label: 'Conversations', href: '/conversations', icon: 'MessageSquare' },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: 'Command Center', href: '/admin', icon: 'Shield' },
  { label: 'Webhooks', href: '/admin/webhooks', icon: 'Webhook' },
  { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
  { label: 'Agents', href: '/admin/agents', icon: 'UserCog' },
] as const;
