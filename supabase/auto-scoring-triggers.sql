-- ============================================================
-- AUTOMATIC REAL-TIME LEAD SCORING TRIGGERS
-- Run this in your Supabase SQL Editor to enable fully automated
-- real-time lead score calculations and conversation tracking.
-- This script uses highly optimized trigger patterns to prevent
-- infinite loops and save database performance.
-- ============================================================

BEGIN;

-- 1. Create a helper function to calculate the score inline from a leads RECORD.
-- This avoids recursive UPDATE loops in BEFORE UPDATE triggers.
CREATE OR REPLACE FUNCTION calculate_lead_score_value(lead_rec RECORD)
RETURNS INT AS $$
DECLARE
  score INT := 0;
BEGIN
  -- Score Budget Tier
  score := score + CASE lead_rec.budget_tier
    WHEN 'under_1m' THEN 10
    WHEN '1m_3m' THEN 20
    WHEN '3m_5m' THEN 35
    WHEN '5m_10m' THEN 45
    WHEN '10m_plus' THEN 55
    ELSE 5
  END;
  
  -- Score Freshness
  score := score + (COALESCE(lead_rec.freshness_score, 100) / 5);
  
  -- Score Conversation Engagement (5 points per exchange, max 20)
  score := score + LEAST(20, COALESCE(lead_rec.conversation_count, 0) * 5);
  
  -- Score Purchase Intent
  score := score + CASE lead_rec.intent
    WHEN 'invest' THEN 10
    WHEN 'buy' THEN 8
    WHEN 'sell' THEN 6
    WHEN 'rent' THEN 4
    ELSE 0
  END;
  
  RETURN LEAST(100, score);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Trigger Function on Leads BEFORE INSERT OR UPDATE
-- Automatically recalculates the lead_score inline whenever scoring factors change.
CREATE OR REPLACE FUNCTION tr_fn_recalculate_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate score directly on the active row
  NEW.lead_score := calculate_lead_score_value(NEW);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind the trigger to the leads table
DROP TRIGGER IF EXISTS tr_leads_recalculate_score ON leads;
CREATE TRIGGER tr_leads_recalculate_score
  BEFORE INSERT OR UPDATE OF budget_tier, intent, freshness_score, conversation_count ON leads
  FOR EACH ROW
  EXECUTE FUNCTION tr_fn_recalculate_lead_score();


-- 3. Trigger Function on Messages AFTER INSERT
-- Automatically increments lead's conversation_count which cascade-updates their score!
CREATE OR REPLACE FUNCTION tr_fn_increment_conversation_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the conversation count in the leads table
  UPDATE leads
  SET conversation_count = COALESCE(conversation_count, 0) + 1
  WHERE id = NEW.lead_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind the message tracking trigger to the messages table
DROP TRIGGER IF EXISTS tr_messages_increment_conversation ON messages;
CREATE TRIGGER tr_messages_increment_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION tr_fn_increment_conversation_count();

COMMIT;
