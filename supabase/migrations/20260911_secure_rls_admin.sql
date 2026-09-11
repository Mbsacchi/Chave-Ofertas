-- ==============================================================================
-- Migration: Criação de Regras de Segurança RLS com Suporte a Admins (RBAC)
-- Data: 2026-09-11
-- ==============================================================================

-- 1. Tabela para armazenar as permissões/cargos dos usuários
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativa RLS na tabela de roles para evitar manipulação indevida
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Usuários só podem ler a própria role
DROP POLICY IF EXISTS "Usuários podem ler o próprio cargo" ON public.user_roles;
CREATE POLICY "Usuários podem ler o próprio cargo" 
  ON public.user_roles FOR SELECT USING (user_id = auth.uid());


-- 2. Função de Segurança Rápida (Executa com privilégio de admin para ignorar RLS circular)
-- Retorna true se o usuário logado tiver a role 'admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ==============================================================================
-- 3. APLICAÇÃO DA NOVA BLINDAGEM RLS NAS TABELAS
-- ==============================================================================

-- Tabela: products (Vitrine)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.products;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.products;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.products;
DROP POLICY IF EXISTS "Apenas admin autenticado gerencia produtos" ON public.products;

CREATE POLICY "Produtos visíveis para todos" 
  ON public.products FOR SELECT USING (true);

CREATE POLICY "Apenas admin insere produtos" 
  ON public.products FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Apenas admin atualiza produtos" 
  ON public.products FOR UPDATE USING (public.is_admin());

CREATE POLICY "Apenas admin deleta produtos" 
  ON public.products FOR DELETE USING (public.is_admin());


-- Tabela: draft_products (Rascunhos)
ALTER TABLE public.draft_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.draft_products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.draft_products;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.draft_products;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.draft_products;
DROP POLICY IF EXISTS "Apenas admin autenticado gerencia rascunhos" ON public.draft_products;

CREATE POLICY "Rascunhos visíveis para todos (apenas front-end lida com ocultação ou admin)" 
  ON public.draft_products FOR SELECT USING (true);

CREATE POLICY "Apenas admin insere rascunhos" 
  ON public.draft_products FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Apenas admin atualiza rascunhos" 
  ON public.draft_products FOR UPDATE USING (public.is_admin());

CREATE POLICY "Apenas admin deleta rascunhos" 
  ON public.draft_products FOR DELETE USING (public.is_admin());


-- Tabela: price_history (Histórico de Preços)
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.price_history;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.price_history;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.price_history;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.price_history;
DROP POLICY IF EXISTS "Apenas admin autenticado gerencia histórico" ON public.price_history;

CREATE POLICY "Histórico visível para todos" 
  ON public.price_history FOR SELECT USING (true);

CREATE POLICY "Apenas admin insere histórico" 
  ON public.price_history FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Apenas admin atualiza histórico" 
  ON public.price_history FOR UPDATE USING (public.is_admin());

CREATE POLICY "Apenas admin deleta histórico" 
  ON public.price_history FOR DELETE USING (public.is_admin());


-- Tabela: coupons (Cupons de Desconto)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cupons públicos visíveis para todos" ON public.coupons;
DROP POLICY IF EXISTS "Apenas admin autenticado gerencia cupons" ON public.coupons;

-- Vitrine deve ver apenas cupons ativos. Se for admin, vê todos (ativos e inativos).
CREATE POLICY "Leitura dinâmica de cupons (Vitrine e Admin)" 
  ON public.coupons FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "Apenas admin insere cupons" 
  ON public.coupons FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Apenas admin atualiza cupons" 
  ON public.coupons FOR UPDATE USING (public.is_admin());

CREATE POLICY "Apenas admin deleta cupons" 
  ON public.coupons FOR DELETE USING (public.is_admin());


-- ==============================================================================
-- SCRIPT PARA PROMOVER O SEU E-MAIL A ADMIN (EXEMPLO)
-- ==============================================================================
/*
COMO SE DAR O CARGO DE ADMIN VIA SQL EDITOR NO SUPABASE:

Copie o trecho abaixo, modifique com o seu e-mail de acesso e execute no painel:

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'seu_email_aqui@exemplo.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

*/
