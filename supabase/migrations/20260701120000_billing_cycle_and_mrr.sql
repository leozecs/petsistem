-- Billing cycle tracking + MRR helpers.
-- Adiciona coluna billing_cycle em subscriptions e payments pra que possamos
-- calcular MRR (mensal + anual/12) e Faturamento Total cumulativo diretamente
-- via service role. Sem views novas — queries diretas em src/app/admin-master.

DO $$ BEGIN
  CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly';

-- Índice pra queries de faturamento total.
CREATE INDEX IF NOT EXISTS payments_paid_at_status_idx
  ON public.payments (paid_at)
  WHERE status = 'paid' AND deleted_at IS NULL;

-- Índice pra query de MRR: precisa filtrar por billing_cycle + paid_at.
CREATE INDEX IF NOT EXISTS payments_mrr_lookup_idx
  ON public.payments (petshop_id, billing_cycle, paid_at DESC)
  WHERE status = 'paid' AND deleted_at IS NULL;

-- payments.billing_cycle vira parte do audit_logs metadata quando confirmado.
COMMENT ON COLUMN public.payments.billing_cycle IS
  'Ciclo do pagamento. MRR = sum(monthly) + sum(annual/12) sobre o último pagamento por petshop nos últimos 35/370 dias.';
COMMENT ON COLUMN public.subscriptions.billing_cycle IS
  'Ciclo herdado do plano. Copiado pra payments quando cobrança é gerada.';
