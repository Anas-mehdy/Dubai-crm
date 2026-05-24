-- ============================================
-- LEADS DEDUPLICATION & UNIQUE CONSTRAINT MIGRATION (CTEs-Only, Pool & Conflict Safe)
-- Run this in your Supabase SQL Editor to clean up duplicate leads
-- and prevent future duplicates permanently.
-- This script does not create any temporary or regular tables,
-- making it 100% resilient to Supabase connection pooling (pg_bouncer).
-- ============================================

BEGIN;

-- 1. Delete duplicate campaign_leads rows before re-linking.
-- If both the primary lead (oldest) and a duplicate lead have a record for the same campaign,
-- we delete the duplicate's row to avoid violating the UNIQUE(campaign_id, lead_id) constraint.
WITH duplicate_leads AS (
  SELECT 
    id as duplicate_id,
    FIRST_VALUE(id) OVER(PARTITION BY phone ORDER BY created_at ASC) as primary_id
  FROM leads
)
DELETE FROM campaign_leads cl
USING duplicate_leads dl
WHERE cl.lead_id = dl.duplicate_id
  AND dl.duplicate_id != dl.primary_id
  AND EXISTS (
    SELECT 1 
    FROM campaign_leads cl_primary 
    WHERE cl_primary.lead_id = dl.primary_id 
      AND cl_primary.campaign_id = cl.campaign_id
  );

-- 2. Re-link campaign_leads records from duplicate lead IDs to the primary surviving ID.
WITH duplicate_leads AS (
  SELECT 
    id as duplicate_id,
    FIRST_VALUE(id) OVER(PARTITION BY phone ORDER BY created_at ASC) as primary_id
  FROM leads
)
UPDATE campaign_leads cl
SET lead_id = dl.primary_id
FROM duplicate_leads dl
WHERE cl.lead_id = dl.duplicate_id
  AND dl.duplicate_id != dl.primary_id;

-- 3. Re-link all message logs from duplicate lead IDs to the primary surviving ID.
WITH duplicate_leads AS (
  SELECT 
    id as duplicate_id,
    FIRST_VALUE(id) OVER(PARTITION BY phone ORDER BY created_at ASC) as primary_id
  FROM leads
)
UPDATE messages msg
SET lead_id = dl.primary_id
FROM duplicate_leads dl
WHERE msg.lead_id = dl.duplicate_id
  AND dl.duplicate_id != dl.primary_id;

-- 4. Delete all duplicate lead records from the leads table, keeping only the oldest record (rn = 1).
WITH ranked_leads AS (
  SELECT 
    id,
    ROW_NUMBER() OVER(PARTITION BY phone ORDER BY created_at ASC) as rn
  FROM leads
)
DELETE FROM leads
WHERE id IN (
  SELECT id 
  FROM ranked_leads 
  WHERE rn > 1
);

-- 5. Add a UNIQUE constraint on the phone column to permanently prevent future duplicate leads!
-- We drop the constraint first if a constraint or index with the same name already exists to avoid conflict.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_phone_key;
ALTER TABLE leads ADD CONSTRAINT leads_phone_key UNIQUE (phone);

COMMIT;
