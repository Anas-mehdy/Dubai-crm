-- ============================================
-- DUBAI PREMIUM REAL ESTATE CRM — FULL SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================

-- ENUMS
CREATE TYPE user_role AS ENUM ('agent', 'admin', 'developer');
CREATE TYPE lead_intent AS ENUM ('buy', 'sell', 'rent', 'invest');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualifying', 'qualified', 'hot', 'converted', 'lost', 'dormant');
CREATE TYPE budget_tier AS ENUM ('under_1m', '1m_3m', '3m_5m', '5m_10m', '10m_plus');
CREATE TYPE client_type AS ENUM ('investor', 'end_user', 'developer_client', 'corporate');
CREATE TYPE property_type AS ENUM ('apartment', 'villa', 'townhouse', 'penthouse', 'plot', 'commercial', 'off_plan');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');

-- ============================================
-- 1. PROFILES (Multi-tenant agents + admin)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'agent',
  phone TEXT,
  whatsapp_number TEXT,
  is_active BOOLEAN DEFAULT true,
  max_leads_per_month INT DEFAULT 1000,
  max_messages_per_day INT DEFAULT 33,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. LEADS (Unified: Version B + C + A fields)
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Version B: Core 4 fields
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  area TEXT,
  property_type property_type,
  
  -- Version C: Dubai Premium fields
  nationality TEXT,
  nationality_flag TEXT,
  budget_tier budget_tier,
  client_type client_type DEFAULT 'end_user',
  
  -- Version A: Enterprise fields
  intent lead_intent DEFAULT 'buy',
  status lead_status DEFAULT 'new',
  lead_score INT DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  freshness_score INT DEFAULT 100 CHECK (freshness_score >= 0 AND freshness_score <= 100),
  
  -- Assignment & Ownership
  assigned_agent_id UUID REFERENCES profiles(id),
  source TEXT DEFAULT 'manual',
  
  -- WhatsApp
  whatsapp_jid TEXT,
  last_message_at TIMESTAMPTZ,
  conversation_count INT DEFAULT 0,
  
  -- Qualification
  qualification_step INT DEFAULT 0,
  qualification_notes JSONB DEFAULT '[]',
  language TEXT DEFAULT 'en',
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_agent ON leads(assigned_agent_id);
CREATE INDEX idx_leads_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_freshness ON leads(freshness_score DESC);

-- ============================================
-- 3. MESSAGES (WhatsApp conversation history)
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id),
  
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  
  status message_status DEFAULT 'pending',
  whatsapp_message_id TEXT,
  
  is_ai_generated BOOLEAN DEFAULT false,
  ai_confidence FLOAT,
  detected_language TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_lead ON messages(lead_id, created_at DESC);

-- ============================================
-- 4. CAMPAIGNS (A/B testing ready)
-- ============================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status campaign_status DEFAULT 'draft',
  
  target_areas TEXT[] DEFAULT '{}',
  target_property_types property_type[] DEFAULT '{}',
  target_budget_tiers budget_tier[] DEFAULT '{}',
  target_nationalities TEXT[] DEFAULT '{}',
  target_intents lead_intent[] DEFAULT '{}',
  
  message_template TEXT NOT NULL,
  message_template_ar TEXT,
  variant_label TEXT DEFAULT 'A',
  
  total_sent INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_read INT DEFAULT 0,
  total_replied INT DEFAULT 0,
  total_qualified INT DEFAULT 0,
  
  daily_send_limit INT DEFAULT 33,
  
  created_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. CAMPAIGN_LEADS (Junction table)
-- ============================================
CREATE TABLE campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  
  variant TEXT DEFAULT 'A',
  
  UNIQUE(campaign_id, lead_id)
);

-- ============================================
-- 6. SYSTEM SETTINGS
-- ============================================
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'general',
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO system_settings (key, value, category, description) VALUES
  ('env_mode', 'test', 'general', 'Global environment: test or production'),
  ('evolution_api_url', '', 'api', 'Evolution API base URL'),
  ('evolution_api_key', '', 'api', 'Evolution API authentication key'),
  ('evolution_instance_name', '', 'api', 'Evolution API instance name'),
  ('openai_api_key', '', 'ai', 'OpenAI API key for AI qualification'),
  ('openai_model', 'gpt-4o-mini', 'ai', 'OpenAI model for chat completion'),
  ('n8n_base_url', '', 'webhook', 'n8n instance base URL'),
  ('n8n_webhook_incoming', '', 'webhook', 'n8n webhook URL for incoming WhatsApp messages'),
  ('n8n_webhook_qualification', '', 'webhook', 'n8n webhook URL for lead qualification flow'),
  ('n8n_webhook_campaign', '', 'webhook', 'n8n webhook URL for campaign message sending'),
  ('n8n_webhook_hot_lead', '', 'webhook', 'n8n webhook URL for HOT lead alerts'),
  ('n8n_webhook_receipts', '', 'webhook', 'n8n webhook URL for WhatsApp delivery receipts'),
  ('daily_message_limit', '33', 'general', 'Max outbound messages per day'),
  ('monthly_lead_limit', '1000', 'general', 'Max new leads per month');

-- ============================================
-- 7. ACTIVITY LOG
-- ============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins see all leads" ON leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );
CREATE POLICY "Agents see assigned leads" ON leads
  FOR SELECT USING (assigned_agent_id = auth.uid());

CREATE POLICY "Messages follow lead access" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = messages.lead_id 
      AND (leads.assigned_agent_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
      ))
    )
  );

CREATE POLICY "Settings admin only" ON system_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

CREATE POLICY "Campaigns viewable by all" ON campaigns
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Campaigns editable by admins" ON campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

CREATE POLICY "Campaign leads viewable by all" ON campaign_leads
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Campaign leads manageable by authenticated" ON campaign_leads
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Activity log viewable by authenticated" ON activity_log
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Activity log insertable by authenticated" ON activity_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 9. FUNCTIONS & TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_leads_updated BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_campaigns_updated BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION decay_freshness_scores()
RETURNS void AS $$
BEGIN
  UPDATE leads
  SET freshness_score = GREATEST(0, freshness_score - 2)
  WHERE status NOT IN ('converted', 'lost')
  AND freshness_score > 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recalculate_lead_score(lead_uuid UUID)
RETURNS INT AS $$
DECLARE
  score INT := 0;
  lead_rec RECORD;
BEGIN
  SELECT * INTO lead_rec FROM leads WHERE id = lead_uuid;
  
  score := score + CASE lead_rec.budget_tier
    WHEN 'under_1m' THEN 10
    WHEN '1m_3m' THEN 20
    WHEN '3m_5m' THEN 35
    WHEN '5m_10m' THEN 45
    WHEN '10m_plus' THEN 55
    ELSE 5
  END;
  
  score := score + (lead_rec.freshness_score / 5);
  score := score + LEAST(20, lead_rec.conversation_count * 5);
  
  score := score + CASE lead_rec.intent
    WHEN 'invest' THEN 10
    WHEN 'buy' THEN 8
    WHEN 'rent' THEN 4
    WHEN 'sell' THEN 6
    ELSE 0
  END;
  
  score := LEAST(100, score);
  
  UPDATE leads SET lead_score = score WHERE id = lead_uuid;
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;

