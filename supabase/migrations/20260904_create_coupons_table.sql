-- Migration: Atualização e criação da tabela de cupons (coupons)
-- Adiciona suporte para store_id, discount_amount, starts_at, ends_at, awin_tracking_url

-- 1. Criação da tabela caso não exista
create table if not exists public.coupons (
  id text primary key,
  store_id text default 'aliexpress',
  store_name text not null,
  code text not null,
  description text default '',
  discount_amount text default '',
  discount_value text default '',
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  valid_until timestamp with time zone,
  awin_tracking_url text not null,
  tracking_url text not null,
  advertiser_id text,
  source text default 'api',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Migrações para tabelas já existentes (garantir que colunas existam)
alter table public.coupons add column if not exists store_id text default 'aliexpress';
alter table public.coupons add column if not exists discount_amount text default '';
alter table public.coupons add column if not exists starts_at timestamp with time zone;
alter table public.coupons add column if not exists ends_at timestamp with time zone;
alter table public.coupons add column if not exists awin_tracking_url text;
alter table public.coupons add column if not exists source text default 'api';
alter table public.coupons add column if not exists discount_value text default '';
alter table public.coupons add column if not exists valid_until timestamp with time zone;
alter table public.coupons add column if not exists tracking_url text;
alter table public.coupons add column if not exists advertiser_id text;
alter table public.coupons add column if not exists is_active boolean default true;

-- 3. Preenchimento de retrocompatibilidade para cupons existentes
update public.coupons set
  store_id = coalesce(store_id, case 
    when advertiser_id = '18879' or store_name ilike '%ali%' then 'aliexpress'
    when advertiser_id = '17729' or store_name ilike '%kabum%' then 'kabum'
    else 'aliexpress'
  end),
  awin_tracking_url = coalesce(awin_tracking_url, tracking_url),
  ends_at = coalesce(ends_at, valid_until),
  discount_amount = coalesce(discount_amount, discount_value),
  source = coalesce(source, case when id like 'manual-%' then 'manual' else 'api' end)
where store_id is null or awin_tracking_url is null or ends_at is null or source is null;

-- 4. Índices para performance de busca e expiração
create index if not exists idx_coupons_store_id on public.coupons(store_id);
create index if not exists idx_coupons_source on public.coupons(source);
create index if not exists idx_coupons_is_active on public.coupons(is_active);
create index if not exists idx_coupons_ends_at on public.coupons(ends_at);
create index if not exists idx_coupons_code on public.coupons(code);

-- 5. RLS (Row Level Security)
alter table public.coupons enable row level security;

drop policy if exists "Cupons públicos visíveis para todos" on public.coupons;
create policy "Cupons públicos visíveis para todos" 
  on public.coupons for select using (is_active = true);

drop policy if exists "Apenas admin autenticado gerencia cupons" on public.coupons;
create policy "Apenas admin autenticado gerencia cupons" 
  on public.coupons for all using (auth.role() = 'authenticated');
