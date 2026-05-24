-- ============================================
-- CAMPAIGN STATS RE-SYNC MIGRATION
-- Run this in your Supabase SQL Editor to instantly re-calculate
-- and update all campaign statistics from your campaign_leads records!
-- This will instantly sync your CRM UI dashboard with the correct values.
-- ============================================

BEGIN;

UPDATE campaigns c
SET 
  total_sent = (
    SELECT COUNT(*) 
    FROM campaign_leads cl 
    WHERE cl.campaign_id = c.id AND cl.sent_at IS NOT NULL
  ),
  total_delivered = (
    SELECT COUNT(*) 
    FROM campaign_leads cl 
    WHERE cl.campaign_id = c.id AND cl.delivered_at IS NOT NULL
  ),
  total_read = (
    SELECT COUNT(*) 
    FROM campaign_leads cl 
    WHERE cl.campaign_id = c.id AND cl.read_at IS NOT NULL
  ),
  total_replied = (
    SELECT COUNT(*) 
    FROM campaign_leads cl 
    WHERE cl.campaign_id = c.id AND cl.replied_at IS NOT NULL
  );

COMMIT;
