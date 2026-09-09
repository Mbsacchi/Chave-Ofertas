-- Adiciona a coluna ends_at (Validade da Oferta) na tabela de produtos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE;

-- Adiciona também na tabela de rascunhos
ALTER TABLE public.draft_products ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE;
