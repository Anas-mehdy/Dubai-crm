-- ============================================================
-- CATEGORIES — Migration
-- Run in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- Categories table
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL DEFAULT '#10b981',
  icon        TEXT NOT NULL DEFAULT '📁',
  description TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Add category_id to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category_id);

-- Default categories
INSERT INTO categories (name, color, icon, description) VALUES
  ('Buyer',    '#3b82f6', '🏠', 'Leads looking to purchase property'),
  ('Seller',   '#f59e0b', '💰', 'Leads looking to sell their property'),
  ('Renter',   '#8b5cf6', '🔑', 'Leads looking to rent a property'),
  ('Investor', '#10b981', '📈', 'Leads looking to invest in real estate');

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by authenticated" ON categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Categories manageable by admins" ON categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','developer'))
  );
