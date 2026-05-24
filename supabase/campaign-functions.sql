-- ============================================================
-- n8n Campaign Workflows — Required Supabase Helper Functions
-- Run these in your Supabase SQL Editor
-- ============================================================

-- 1. Atomically increment total_sent on a campaign
CREATE OR REPLACE FUNCTION increment_campaign_sent(p_campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET total_sent = total_sent + 1,
      updated_at = now()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atomically increment any delivery stat column (total_delivered, total_read, total_replied)
CREATE OR REPLACE FUNCTION increment_campaign_stat(p_campaign_id UUID, p_field TEXT)
RETURNS void AS $$
BEGIN
  -- Whitelist allowed column names to prevent SQL injection
  IF p_field NOT IN ('total_delivered', 'total_read', 'total_replied', 'total_qualified') THEN
    RAISE EXCEPTION 'Invalid field: %', p_field;
  END IF;

  EXECUTE format(
    'UPDATE campaigns SET %I = %I + 1, updated_at = now() WHERE id = $1',
    p_field, p_field
  ) USING p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to anon/service_role so n8n can call these via REST
GRANT EXECUTE ON FUNCTION increment_campaign_sent(UUID) TO anon, service_role;
GRANT EXECUTE ON FUNCTION increment_campaign_stat(UUID, TEXT) TO anon, service_role;
