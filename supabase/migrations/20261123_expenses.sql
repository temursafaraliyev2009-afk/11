-- ═══════════════════════════════════════════════════════════════════════
-- SAVATCHI — QO'SHIMCHA XARAJATLAR (Additional Expenses) Table
-- Migration: 20261123_expenses.sql
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.expenses (
  store_id   TEXT NOT NULL,
  id         TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  amount     BIGINT NOT NULL DEFAULT 0,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_type TEXT NOT NULL DEFAULT 'Naqd',
  note       TEXT,
  created_by_id   UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (store_id, id)
);

-- Index for fast store-scoped queries
CREATE INDEX IF NOT EXISTS idx_expenses_store_date
  ON public.expenses (store_id, date DESC);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────
-- RLS Policies: Faqat do'kon egasi va shu do'konga tegishli xodimlar
-- (public.is_store_member funksiyasi orqali — rentals, installments,
--  activities jadvallaridagi siyosat bilan bir xil)
-- ───────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "expenses_all_authenticated" ON public.expenses;

DROP POLICY IF EXISTS "expenses_select_store_members" ON public.expenses;
CREATE POLICY "expenses_select_store_members" ON public.expenses
  FOR SELECT USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "expenses_insert_store_members" ON public.expenses;
CREATE POLICY "expenses_insert_store_members" ON public.expenses
  FOR INSERT WITH CHECK (public.is_store_member(store_id));

DROP POLICY IF EXISTS "expenses_update_store_members" ON public.expenses;
CREATE POLICY "expenses_update_store_members" ON public.expenses
  FOR UPDATE USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "expenses_delete_store_members" ON public.expenses;
CREATE POLICY "expenses_delete_store_members" ON public.expenses
  FOR DELETE USING (public.is_store_member(store_id));

-- ───────────────────────────────────────────────────────────────────────
-- TRIGGER: updated_at avtomatik yangilash (mavjud funksiyadan foydalanish)
-- ───────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ───────────────────────────────────────────────────────────────────────
-- GRANT: authenticated roliga CRUD huquqlari
-- ───────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- REALTIME: Idempotent publication (qayta bajarishda xato bermaydi)
-- ───────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.expenses IS 'Savatchi do''konlarining qo''shimcha xarajatlari (ijara, maosh, elektr, suv va boshqalar)';
