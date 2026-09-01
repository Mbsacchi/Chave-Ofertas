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

-- 2. Tabela de Rascunhos (Staging)
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

-- 3. Tabela de Produtos Publicados (Vitrine)
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
  is_verified boolean default true,
  is_active boolean default true,
  offers jsonb default '[]'::jsonb,
  price_history jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabela de Cupons Reais (Awin & Lojas Parceiras)
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

-- 5. Políticas de Segurança (Row Level Security - RLS)
alter table public.draft_products enable row level security;
alter table public.products enable row level security;
alter table public.coupons enable row level security;

-- Produtos e cupons públicos podem ser lidos por qualquer usuário
create policy "Produtos públicos visíveis para todos" 
  on public.products for select using (is_active = true);

create policy "Cupons públicos visíveis para todos" 
  on public.coupons for select using (is_active = true);

-- Apenas administradores autenticados podem alterar produtos, rascunhos e cupons
create policy "Apenas admin autenticado gerencia rascunhos" 
  on public.draft_products for all using (auth.role() = 'authenticated');

create policy "Apenas admin autenticado gerencia produtos" 
  on public.products for all using (auth.role() = 'authenticated');

create policy "Apenas admin autenticado gerencia cupons" 
  on public.coupons for all using (auth.role() = 'authenticated');
`;
