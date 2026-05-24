-- ============================================================
-- DUBAI CRM — TRANSACTION-SAFE CAMPAIGN STATS TRIGGERS
-- Run these in your Supabase SQL Editor to prevent double-counting
-- and solve all race conditions/concurrency issues permanently!
-- ============================================================

-- 1. Trigger Function to automatically and atomically sync campaign stats
-- based on campaign_leads timestamp transitions (NULL -> NOT NULL).
-- This guarantees exactly-once increments regardless of webhook concurrency or retries.
CREATE OR REPLACE FUNCTION tr_sync_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync total_sent when sent_at is first recorded
  IF (OLD.sent_at IS NULL AND NEW.sent_at IS NOT NULL) THEN
    UPDATE campaigns
    SET total_sent = COALESCE(total_sent, 0) + 1,
        updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;

  -- Sync total_delivered when delivered_at is first recorded (DELIVERY_ACK)
  IF (OLD.delivered_at IS NULL AND NEW.delivered_at IS NOT NULL) THEN
    UPDATE campaigns
    SET total_delivered = COALESCE(total_delivered, 0) + 1,
        updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;

  -- Sync total_read when read_at is first recorded (READ or PLAYED)
  IF (OLD.read_at IS NULL AND NEW.read_at IS NOT NULL) THEN
    UPDATE campaigns
    SET total_read = COALESCE(total_read, 0) + 1,
        updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;

  -- Sync total_replied when replied_at is first recorded (first incoming response)
  IF (OLD.replied_at IS NULL AND NEW.replied_at IS NOT NULL) THEN
    UPDATE campaigns
    SET total_replied = COALESCE(total_replied, 0) + 1,
        updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the AFTER UPDATE trigger on campaign_leads
DROP TRIGGER IF EXISTS tr_campaign_leads_stats ON campaign_leads;
CREATE TRIGGER tr_campaign_leads_stats
  AFTER UPDATE ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION tr_sync_campaign_stats();


-- 2. Trigger Function to automatically record replied_at in campaign_leads
-- when a lead sends an inbound WhatsApp message.
-- This automatically triggers the campaign stat increment above!
CREATE OR REPLACE FUNCTION tr_sync_message_replied()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if it's an inbound message
  IF NEW.direction = 'inbound' THEN
    UPDATE campaign_leads
    SET replied_at = NEW.created_at
    WHERE lead_id = NEW.lead_id
      AND sent_at IS NOT NULL
      AND replied_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the AFTER INSERT trigger on messages
DROP TRIGGER IF EXISTS tr_messages_sync_replied ON messages;
CREATE TRIGGER tr_messages_sync_replied
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION tr_sync_message_replied();
