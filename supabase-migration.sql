-- ImageGen AI: User Settings Table Migration
-- Run this in your Supabase SQL Editor

-- Create the user settings table
CREATE TABLE IF NOT EXISTS imagegen_user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  aws_access_key_id TEXT,
  aws_secret_access_key TEXT,
  aws_region TEXT DEFAULT 'ap-south-1',
  aws_bucket TEXT DEFAULT 'amazon-image-data',
  n8n_pdp_webhook_url TEXT,
  n8n_single_webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE imagegen_user_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own settings
CREATE POLICY "Users can view own settings" ON imagegen_user_settings 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own settings
CREATE POLICY "Users can insert own settings" ON imagegen_user_settings 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own settings
CREATE POLICY "Users can update own settings" ON imagegen_user_settings 
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own settings
CREATE POLICY "Users can delete own settings" ON imagegen_user_settings 
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_imagegen_user_settings_user_id 
  ON imagegen_user_settings(user_id);
