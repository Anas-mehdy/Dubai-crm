// ============================================
// Global TypeScript Types — Dubai CRM
// ============================================

export type UserRole = 'agent' | 'admin' | 'developer';
export type LeadIntent = 'buy' | 'sell' | 'rent' | 'invest';
export type LeadStatus = 'new' | 'contacted' | 'qualifying' | 'qualified' | 'hot' | 'converted' | 'lost' | 'dormant';
export type BudgetTier = 'under_1m' | '1m_3m' | '3m_5m' | '5m_10m' | '10m_plus';
export type ClientType = 'investor' | 'end_user' | 'developer_client' | 'corporate';
export type PropertyType = 'apartment' | 'villa' | 'townhouse' | 'penthouse' | 'plot' | 'commercial' | 'off_plan';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type EnvMode = 'test' | 'production';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
  max_leads_per_month: number;
  max_messages_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  area: string | null;
  property_type: PropertyType | null;
  nationality: string | null;
  nationality_flag: string | null;
  budget_tier: BudgetTier | null;
  client_type: ClientType;
  intent: LeadIntent;
  status: LeadStatus;
  lead_score: number;
  freshness_score: number;
  assigned_agent_id: string | null;
  source: string;
  whatsapp_jid: string | null;
  last_message_at: string | null;
  conversation_count: number;
  qualification_step: number;
  qualification_notes: unknown[];
  language: string;
  tags: string[];
  notes: string | null;
  custom_fields: Record<string, unknown>;
  category_id: string | null;
  is_bot_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_agent?: Profile;
  category?: Category;
}

export interface Message {
  id: string;
  lead_id: string;
  agent_id: string | null;
  direction: MessageDirection;
  content: string;
  media_url: string | null;
  media_type: string | null;
  status: MessageStatus;
  whatsapp_message_id: string | null;
  is_ai_generated: boolean;
  ai_confidence: number | null;
  detected_language: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  // joined
  lead_count?: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  target_areas: string[];
  target_property_types: PropertyType[];
  target_budget_tiers: BudgetTier[];
  target_nationalities: string[];
  target_intents: LeadIntent[];
  message_template: string;
  message_template_ar: string | null;
  variant_label: string;
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_replied: number;
  total_qualified: number;
  daily_send_limit: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string | null;
  is_encrypted: boolean;
  category: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// UI-specific types
export interface LeadScoreColor {
  bg: string;
  text: string;
  ring: string;
  label: string;
}

export interface WebhookConfig {
  key: string;
  label: string;
  description: string;
  testUrl: string;
  prodUrl: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  content_ar: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagMetadata {
  id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
}

export interface LeadScoreHistory {
  id: string;
  lead_id: string;
  old_score: number;
  new_score: number;
  reason: string;
  created_at: string;
}

