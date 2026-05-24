-- ============================================================
-- SPRINT 2: MEDIUM-PRIORITY MVP GAP CLOSURE MIGRATION
-- Run this in your Supabase SQL Editor to establish:
-- 1. message_templates (Reusable campaign templates)
-- 2. tags_metadata (Centralized tag management with color & desc)
-- 3. lead_score_history (Automatic qualification score logs)
-- 4. Triggers to auto-log score changes and auto-sync tag renames
-- ============================================================

BEGIN;

-- ============================================================
-- 1. REUSABLE MESSAGE TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  content TEXT NOT NULL,
  content_ar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Message templates viewable by authenticated" ON message_templates;
CREATE POLICY "Message templates viewable by authenticated" ON message_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Message templates manageable by admins" ON message_templates;
CREATE POLICY "Message templates manageable by admins" ON message_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

-- ============================================================
-- 2. CENTRALIZED TAG METADATA
-- ============================================================
CREATE TABLE IF NOT EXISTS tags_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE tags_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tags metadata viewable by authenticated" ON tags_metadata;
CREATE POLICY "Tags metadata viewable by authenticated" ON tags_metadata
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Tags metadata manageable by admins" ON tags_metadata;
CREATE POLICY "Tags metadata manageable by admins" ON tags_metadata
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

-- Seed preset tags
INSERT INTO tags_metadata (name, color, description) VALUES
  ('VIP Client', '#ec4899', 'High net worth individuals & premium buyers'),
  ('Cash Buyer', '#10b981', 'Clients ready to purchase immediately with cash'),
  ('Overseas Investor', '#8b5cf6', 'International clients looking for investment yields'),
  ('Mortgage Pre-Approved', '#3b82f6', 'Verified financing through local UAE banks'),
  ('Callback Requested', '#f59e0b', 'Requires direct phone call from assigned agent'),
  ('Do Not Contact', '#ef4444', 'Blacklisted phone numbers'),
  ('Off-Plan Interest', '#06b6d4', 'Interested in new project launches & payment plans'),
  ('Hot Lead', '#f43f5e', 'Highly active prospect showing extreme intent')
ON CONFLICT (name) DO NOTHING;

-- Trigger: Rename tag globally inside leads when tags_metadata name is updated
CREATE OR REPLACE FUNCTION tr_fn_sync_lead_tags_on_metadata_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    UPDATE leads
    SET tags = array_replace(tags, OLD.name, NEW.name)
    WHERE OLD.name = ANY(tags);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_tags_metadata_sync_rename ON tags_metadata;
CREATE TRIGGER tr_tags_metadata_sync_rename
  AFTER UPDATE OF name ON tags_metadata
  FOR EACH ROW
  EXECUTE FUNCTION tr_fn_sync_lead_tags_on_metadata_change();

-- Trigger: Remove tag globally from leads when tags_metadata is deleted
CREATE OR REPLACE FUNCTION tr_fn_sync_lead_tags_on_metadata_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads
  SET tags = array_remove(tags, OLD.name)
  WHERE OLD.name = ANY(tags);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_tags_metadata_sync_delete ON tags_metadata;
CREATE TRIGGER tr_tags_metadata_sync_delete
  AFTER DELETE ON tags_metadata
  FOR EACH ROW
  EXECUTE FUNCTION tr_fn_sync_lead_tags_on_metadata_delete();

-- ============================================================
-- 3. SCORE HISTORY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  old_score INT NOT NULL,
  new_score INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lead score history viewable by all authenticated" ON lead_score_history;
CREATE POLICY "Lead score history viewable by all authenticated" ON lead_score_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger to automatically log score changes on leads table update
CREATE OR REPLACE FUNCTION tr_fn_log_lead_score_change()
RETURNS TRIGGER AS $$
DECLARE
  change_reason TEXT := 'System update';
BEGIN
  IF OLD.lead_score IS DISTINCT FROM NEW.lead_score THEN
    -- Determine reason based on which scoring factor changed
    IF OLD.budget_tier IS DISTINCT FROM NEW.budget_tier THEN
      change_reason := 'Budget tier updated to ' || COALESCE(NEW.budget_tier::text, 'none');
    ELSIF OLD.intent IS DISTINCT FROM NEW.intent THEN
      change_reason := 'Intent updated to ' || COALESCE(NEW.intent::text, 'none');
    ELSIF OLD.conversation_count IS DISTINCT FROM NEW.conversation_count THEN
      change_reason := 'Conversation count updated to ' || NEW.conversation_count;
    ELSIF OLD.freshness_score IS DISTINCT FROM NEW.freshness_score THEN
      change_reason := 'Freshness score adjusted to ' || NEW.freshness_score;
    ELSE
      change_reason := 'Manual score calculation / details updated';
    END IF;

    INSERT INTO lead_score_history (lead_id, old_score, new_score, reason)
    VALUES (NEW.id, OLD.lead_score, NEW.lead_score, change_reason);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_leads_log_score_change ON leads;
CREATE TRIGGER tr_leads_log_score_change
  AFTER UPDATE OF lead_score ON leads
  FOR EACH ROW
  EXECUTE FUNCTION tr_fn_log_lead_score_change();

COMMIT;
