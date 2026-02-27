-- Run this script in your Supabase SQL Editor to create the wallets table

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table definition for wallets
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    encrypted_mnemonic TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Safety Policy: Users can only see their own wallets
CREATE POLICY "Users can view their own wallets" 
ON public.wallets 
FOR SELECT 
USING (auth.uid() = user_id);

-- Safety Policy: Users can only create wallets for themselves
CREATE POLICY "Users can create their own wallets" 
ON public.wallets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Safety Policy: Users can only update their own wallets (e.g., changing wallet name)
CREATE POLICY "Users can update their own wallets" 
ON public.wallets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Safety Policy: Users can delete their own wallets
CREATE POLICY "Users can delete their own wallets" 
ON public.wallets 
FOR DELETE 
USING (auth.uid() = user_id);

-- --------------------------------------------------------
-- NEW TABLES FOR PHASE 2 (Logging & Settings)
-- --------------------------------------------------------

-- Table definition for transaction logs
CREATE TABLE IF NOT EXISTS public.transaction_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    tx_hash TEXT,
    amount DOUBLE PRECISION,
    type TEXT CHECK (type IN ('send', 'receive')),
    status TEXT DEFAULT 'broadcasted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table definition for error logs
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    context TEXT,
    error_message TEXT,
    stack_trace TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table definition for user settings
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    require_password_for_tx BOOLEAN DEFAULT FALSE,
    theme TEXT DEFAULT 'dark',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for new tables
ALTER TABLE public.transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies for transaction_logs
CREATE POLICY "Users can view their own transaction logs" ON public.transaction_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transaction logs" ON public.transaction_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for error_logs
CREATE POLICY "Users can view their own error logs" ON public.error_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own error logs" ON public.error_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Policies for user_settings
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------
-- MIGRATIONS & UPDATES
-- --------------------------------------------------------

-- Add deleted_at column for Soft Delete (Safe Delete)
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add language column for i18n (Internationalization)
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add sync_interval column for Auto-Sync settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS sync_interval INTEGER DEFAULT 120;
