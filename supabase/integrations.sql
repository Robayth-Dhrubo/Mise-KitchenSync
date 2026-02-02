-- Integrations table for storing OAuth connections
CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL, -- 'square', 'toast', 'quickbooks', etc.
    access_token TEXT,
    refresh_token TEXT,
    merchant_id TEXT,
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
    last_sync TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Add source and external_id to ingredients for tracking imported items
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Create unique constraint for external imports
CREATE UNIQUE INDEX IF NOT EXISTS ingredients_user_external_idx 
ON ingredients(user_id, external_id) 
WHERE external_id IS NOT NULL;

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own integrations
CREATE POLICY "Users can view own integrations" ON integrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations" ON integrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON integrations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON integrations
    FOR DELETE USING (auth.uid() = user_id);
