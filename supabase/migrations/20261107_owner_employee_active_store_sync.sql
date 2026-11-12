-- ============================================================================
-- Savatchi POS — Owner-Employee Active Store Synchronization
-- Migration: 20261107_owner_employee_active_store_sync.sql
-- Description:
--   1. Adds active_store_id column to public.profiles to persist Owner's active store
--   2. Creates index on active_store_id for high-performance lookup
--   3. Enables Supabase Realtime publication on public.profiles
--   4. Adds secure helper RPC get_owner_active_store
-- Idempotent: Can be executed multiple times safely without data loss.
-- ============================================================================

-- 1. Add active_store_id to public.profiles if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_store_id TEXT;

-- 2. Index for active_store_id lookup
CREATE INDEX IF NOT EXISTS idx_profiles_active_store_id ON public.profiles(active_store_id);

-- 3. Add to supabase_realtime publication if publication exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 4. Secure RPC function to get an owner's currently active store ID
CREATE OR REPLACE FUNCTION public.get_owner_active_store(owner_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  v_store_id TEXT;
BEGIN
  SELECT active_store_id INTO v_store_id
  FROM public.profiles
  WHERE id = owner_uuid;

  RETURN v_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_owner_active_store(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_owner_active_store(UUID) TO authenticated;

