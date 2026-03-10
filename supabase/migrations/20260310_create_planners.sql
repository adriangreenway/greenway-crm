-- Create planners table
CREATE TABLE IF NOT EXISTS planners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL,
  company text,
  email text,
  phone text,
  instagram text,
  website text,
  venues text[] DEFAULT '{}',
  tier text NOT NULL DEFAULT 'new' CHECK (tier IN ('new', 'warm', 'strong', 'vip')),
  first_contact_date date,
  last_outreach_date date,
  next_outreach_date date,
  notes text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_planners_name ON planners (name);
CREATE INDEX IF NOT EXISTS idx_planners_tier ON planners (tier);
CREATE INDEX IF NOT EXISTS idx_planners_company ON planners (company);

-- Updated_at trigger (same pattern as galleries, contracts)
CREATE OR REPLACE FUNCTION update_planners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER planners_updated_at
  BEFORE UPDATE ON planners
  FOR EACH ROW
  EXECUTE FUNCTION update_planners_updated_at();

-- RLS
ALTER TABLE planners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can do everything with planners"
  ON planners FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE planners;

-- Add planner_id FK to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS planner_id uuid REFERENCES planners(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_leads_planner_id ON leads (planner_id);
