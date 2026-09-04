-- ==============================================================================
-- Migration: Alinhamento de Estrutura da Tabela coupons (ends_at e valid_until)
-- ==============================================================================
-- Este script garante a existência da coluna 'ends_at' na tabela public.coupons,
-- além de manter retrocompatibilidade com 'valid_until' e sincronizar os registros.
-- Execute este script no Editor SQL do seu painel Supabase.

-- 1. Adiciona a coluna ends_at caso não exista
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE;

-- 2. Garante a existência das demais colunas do modelo atualizado (caso faltem)
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS store_id TEXT DEFAULT 'aliexpress';

ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS discount_amount TEXT DEFAULT '';

ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS awin_tracking_url TEXT;

ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'api';

ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS tracking_url TEXT;

ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS discount_value TEXT DEFAULT '';

ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. Sincronização bidirecional de dados entre ends_at e valid_until
-- Copia valid_until para ends_at onde ends_at estiver vazio
UPDATE public.coupons 
SET ends_at = valid_until 
WHERE ends_at IS NULL AND valid_until IS NOT NULL;

-- Copia ends_at para valid_until onde valid_until estiver vazio
UPDATE public.coupons 
SET valid_until = ends_at 
WHERE valid_until IS NULL AND ends_at IS NOT NULL;

-- Sincroniza tracking_url com awin_tracking_url
UPDATE public.coupons
SET awin_tracking_url = tracking_url
WHERE awin_tracking_url IS NULL AND tracking_url IS NOT NULL;

UPDATE public.coupons
SET tracking_url = awin_tracking_url
WHERE tracking_url IS NULL AND awin_tracking_url IS NOT NULL;

-- Sincroniza discount_amount com discount_value
UPDATE public.coupons
SET discount_amount = discount_value
WHERE (discount_amount IS NULL OR discount_amount = '') AND discount_value IS NOT NULL AND discount_value != '';

-- 4. Criação de índices para consultas de cupons válidos e expiração
CREATE INDEX IF NOT EXISTS idx_coupons_ends_at ON public.coupons(ends_at);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_until ON public.coupons(valid_until);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active);

-- 5. Trigger automática para manter ends_at e valid_until sempre em sincronia
CREATE OR REPLACE FUNCTION public.sync_coupon_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ends_at IS NULL AND NEW.valid_until IS NOT NULL THEN
    NEW.ends_at := NEW.valid_until;
  ELSIF NEW.valid_until IS NULL AND NEW.ends_at IS NOT NULL THEN
    NEW.valid_until := NEW.ends_at;
  END IF;

  IF NEW.awin_tracking_url IS NULL AND NEW.tracking_url IS NOT NULL THEN
    NEW.awin_tracking_url := NEW.tracking_url;
  ELSIF NEW.tracking_url IS NULL AND NEW.awin_tracking_url IS NOT NULL THEN
    NEW.tracking_url := NEW.awin_tracking_url;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_coupon_dates ON public.coupons;
CREATE TRIGGER trg_sync_coupon_dates
BEFORE INSERT OR UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.sync_coupon_dates();
