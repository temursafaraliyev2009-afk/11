-- supabase/migrations/20261110_products_realtime_publication.sql
-- Savatchi POS — Enable Realtime Publication for Products
-- Description:
--   Enables Supabase Realtime replication on public.products so that
--   Owner and Employee devices receive live product catalog updates (INSERT, UPDATE, DELETE).
-- Idempotent: Can be executed multiple times safely without error or duplicate objects.

DO $$
BEGIN
  -- 1. Check if supabase_realtime publication exists
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- 2. Add public.products only if not already present
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'products'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

