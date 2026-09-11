-- ==============================================================================
-- Migration: Proteção Crítica de Dados Sensíveis na Tabela profiles
-- Data: 2026-09-11
-- ==============================================================================

-- Habilita RLS na tabela
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Remoção das políticas vulneráveis antigas (incluindo a de SELECT "USING (true)")
DROP POLICY IF EXISTS "Perfis visíveis para todos" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir o próprio perfil" ON public.profiles;

-- Revoga leitura pública na tabela diretamente (caso haja grant pra 'anon')
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- 2. Nova Política de Leitura (SELECT)
-- Usuário lê apenas a si mesmo. Administrador (is_admin()) lê todos.
CREATE POLICY "Leitura restrita de perfil"
ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR public.is_admin()
);

-- 3. Nova Política de Atualização (UPDATE)
-- Usuário atualiza apenas a si mesmo, DESDE QUE não altere "email" nem "is_admin".
-- O "IS NOT DISTINCT FROM" previne quebra de query caso o campo seja null.
-- Administradores possuem passe livre para modificar qualquer dado.
CREATE POLICY "Atualização restrita de perfil"
ON public.profiles
FOR UPDATE USING (
  auth.uid() = id OR public.is_admin()
) WITH CHECK (
  public.is_admin() OR 
  (
    auth.uid() = id AND 
    email IS NOT DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.id = id) AND
    is_admin IS NOT DISTINCT FROM (SELECT p.is_admin FROM public.profiles p WHERE p.id = id)
  )
);

-- 4. Nova Política de Exclusão (DELETE)
-- Apenas administradores podem excluir perfis.
CREATE POLICY "Exclusão restrita a administradores"
ON public.profiles
FOR DELETE USING (
  public.is_admin()
);

-- 5. Nova Política de Inserção (INSERT)
-- Geralmente os perfis são inseridos via Trigger ao criar conta.
-- Mantemos a política que permite inserção do próprio ID (pelo fluxo do Supabase)
-- ou por um administrador.
CREATE POLICY "Inserção restrita de perfil"
ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() = id OR public.is_admin()
);
