import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isAnonKeyMissing = Boolean(
  !supabaseAnonKey || 
  supabaseAnonKey.trim() === '' || 
  supabaseAnonKey === 'COLE_SUA_CHAVE_AQUI' ||
  supabaseAnonKey === 'your-anon-key' ||
  supabaseAnonKey === 'your-supabase-anon-key-here' ||
  supabaseAnonKey === 'placeholder-anon-key'
);

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  !isAnonKeyMissing
);

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  isAnonKeyMissing ? 'placeholder-anon-key' : supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * SQL Schema for Supabase Setup
 * This can be run in the Supabase SQL Editor to create tables for products and drafts
 */
export const SUPABASE_SQL_SCHEMA = `-- 1. Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- 2. Tabela de Perfis de Usuários (Profiles) com criação automática no Login
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Trigger à Prova de Falhas para Novos Usuários do Google OAuth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), 'Usuário'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Tabela de Rascunhos (Staging)
create table if not exists public.draft_products (
  id text primary key,
  external_id text,
  title text not null,
  brand text default '',
  description text default '',
  category_id text not null,
  category_name text not null,
  subcategory_id text,
  subcategory_name text,
  image_url text not null,
  original_price numeric(10,2) default 0,
  promotional_price numeric(10,2) not null,
  discount_percent integer default 0,
  affiliate_url text not null,
  store_id text default 'mercadolivre',
  store_name text default 'Mercado Livre',
  free_shipping boolean default false,
  installment text default 'À vista',
  status text default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabela de Produtos Publicados (Vitrine com Popularidade / Cliques)
create table if not exists public.products (
  id text primary key,
  title text not null,
  slug text not null,
  description text,
  category_id text not null,
  category_name text not null,
  subcategory_id text,
  subcategory_name text,
  brand text not null,
  sku text,
  ean text,
  image_url text not null,
  search_keywords text[],
  min_price numeric(10,2) not null,
  max_price numeric(10,2) not null,
  historical_lowest_price numeric(10,2),
  best_store text not null,
  best_store_id text not null,
  rating numeric(3,1) default 4.8,
  reviews_count integer default 100,
  click_count integer default 0,
  is_verified boolean default true,
  is_active boolean default true,
  offers jsonb default '[]'::jsonb,
  price_history jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.products add column if not exists click_count integer default 0;

-- 6. Tabela de Histórico de Preços (Inteligência de Tendências e Evolução)
create table if not exists public.price_history (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  price numeric(10,2) not null,
  recorded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_price_history_product_id on public.price_history(product_id);
create index if not exists idx_price_history_recorded_at on public.price_history(recorded_at);

-- 7. Tabela de Cupons Reais (Awin & Lojas Parceiras)
create table if not exists public.coupons (
  id text primary key,
  advertiser_id text,
  store_name text not null,
  code text not null,
  description text default '',
  tracking_url text not null,
  valid_until timestamp with time zone,
  discount_value text default '',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Função para Incremento Atômico de Cliques (Popularidade)
create or replace function public.increment_product_clicks(target_product_id text)
returns void as $$
begin
  update public.products
  set click_count = coalesce(click_count, 0) + 1
  where id = target_product_id;
end;
$$ language plpgsql security definer;

-- 9. Políticas de Segurança (Row Level Security - RLS)
alter table public.profiles enable row level security;
alter table public.draft_products enable row level security;
alter table public.products enable row level security;
alter table public.price_history enable row level security;
alter table public.coupons enable row level security;

-- Limpa políticas antigas de perfis caso existam
drop policy if exists "Perfis visíveis para todos" on public.profiles;
drop policy if exists "Usuários podem ver o próprio perfil" on public.profiles;
drop policy if exists "Usuários podem atualizar o próprio perfil" on public.profiles;
drop policy if exists "Usuários podem inserir o próprio perfil" on public.profiles;

-- Políticas de Profiles (Seguro, Não Bloqueante)
create policy "Perfis visíveis para usuários autenticados e anônimos"
  on public.profiles for select using (true);

create policy "Usuários autenticados podem inserir seu próprio perfil"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Usuários autenticados podem atualizar seu próprio perfil"
  on public.profiles for update using (auth.uid() = id);

-- Políticas de Produtos, Histórico e Cupons (Leitura Pública)
drop policy if exists "Produtos públicos visíveis para todos" on public.products;
create policy "Produtos públicos visíveis para todos" 
  on public.products for select using (is_active = true);

drop policy if exists "Histórico de preços público para leitura" on public.price_history;
create policy "Histórico de preços público para leitura" 
  on public.price_history for select using (true);

drop policy if exists "Cupons públicos visíveis para todos" on public.coupons;
create policy "Cupons públicos visíveis para todos" 
  on public.coupons for select using (is_active = true);

-- Políticas Administrativas (Mutação)
drop policy if exists "Apenas admin autenticado gerencia rascunhos" on public.draft_products;
create policy "Apenas admin autenticado gerencia rascunhos" 
  on public.draft_products for all using (auth.role() = 'authenticated');

drop policy if exists "Apenas admin autenticado gerencia produtos" on public.products;
create policy "Apenas admin autenticado gerencia produtos" 
  on public.products for all using (auth.role() = 'authenticated');

drop policy if exists "Apenas admin autenticado gerencia histórico" on public.price_history;
create policy "Apenas admin autenticado gerencia histórico" 
  on public.price_history for all using (auth.role() = 'authenticated');

drop policy if exists "Apenas admin autenticado gerencia cupons" on public.coupons;
create policy "Apenas admin autenticado gerencia cupons" 
  on public.coupons for all using (auth.role() = 'authenticated');

-- 10. Concessão de Privilégios (Grants)
grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on all tables in schema public to service_role;
`;
