-- Kathryn's Bakery – initial schema
--
-- Built to live inside a shared Supabase project alongside other apps:
--   * every table, function and trigger is prefixed `bakery_`
--   * no trigger on auth.users and no profiles table – sign-in uses the
--     project's existing Supabase Auth users
--   * admin access reuses the project's existing `public.site_admins` table
--     and `public.is_site_admin()` function (created below only if missing)
--   * photos go into a dedicated `bakery-images` storage bucket
--
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to re-run.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Admins (shared with the other apps in this project)
-- ---------------------------------------------------------------------------
create table if not exists public.site_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.site_admins enable row level security;

do $$
begin
  if to_regprocedure('public.is_site_admin()') is null then
    execute $f$
      create function public.is_site_admin()
      returns boolean language sql stable security definer set search_path = public as $b$
        select exists (select 1 from public.site_admins where user_id = auth.uid());
      $b$
    $f$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.bakery_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Site content (About us / Our mission)
-- ---------------------------------------------------------------------------
create table if not exists public.bakery_site_content (
  key text primary key,
  title text not null default '',
  body text not null default '',
  updated_at timestamptz not null default now()
);
drop trigger if exists bakery_site_content_touch on public.bakery_site_content;
create trigger bakery_site_content_touch before update on public.bakery_site_content
  for each row execute function public.bakery_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Ingredients
-- ---------------------------------------------------------------------------
create table if not exists public.bakery_ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  allergens text[] not null default '{}',
  default_unit text not null default 'g',
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Recipes
-- ---------------------------------------------------------------------------
create table if not exists public.bakery_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  instructions text,
  yield_qty numeric,
  yield_unit text,
  image_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists bakery_recipes_touch on public.bakery_recipes;
create trigger bakery_recipes_touch before update on public.bakery_recipes
  for each row execute function public.bakery_touch_updated_at();

create table if not exists public.bakery_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.bakery_recipes (id) on delete cascade,
  ingredient_id uuid not null references public.bakery_ingredients (id) on delete restrict,
  quantity numeric,
  unit text,
  note text,
  position int not null default 0
);
create index if not exists bakery_recipe_ingredients_recipe_idx on public.bakery_recipe_ingredients (recipe_id);
create index if not exists bakery_recipe_ingredients_ingredient_idx on public.bakery_recipe_ingredients (ingredient_id);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table if not exists public.bakery_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  description text,
  price numeric(10, 2),
  image_url text,
  recipe_id uuid references public.bakery_recipes (id) on delete set null,
  shelf_life_days int,
  net_weight text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bakery_products_recipe_idx on public.bakery_products (recipe_id);
drop trigger if exists bakery_products_touch on public.bakery_products;
create trigger bakery_products_touch before update on public.bakery_products
  for each row execute function public.bakery_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Featured this week
-- ---------------------------------------------------------------------------
create table if not exists public.bakery_featured_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.bakery_products (id) on delete cascade,
  starts_on date not null default current_date,
  ends_on date not null default (current_date + 6),
  blurb text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index if not exists bakery_featured_items_product_idx on public.bakery_featured_items (product_id);

-- ---------------------------------------------------------------------------
-- Inventory (admin only)
-- ---------------------------------------------------------------------------
create table if not exists public.bakery_inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  category text not null default 'ingredient'
    check (category in ('ingredient', 'packaging', 'finished_good', 'supply')),
  ingredient_id uuid references public.bakery_ingredients (id) on delete set null,
  product_id uuid references public.bakery_products (id) on delete set null,
  quantity numeric not null default 0,
  unit text not null default 'ea',
  reorder_level numeric not null default 0,
  location text,
  supplier text,
  expires_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bakery_inventory_items_ingredient_idx on public.bakery_inventory_items (ingredient_id);
create index if not exists bakery_inventory_items_product_idx on public.bakery_inventory_items (product_id);
drop trigger if exists bakery_inventory_items_touch on public.bakery_inventory_items;
create trigger bakery_inventory_items_touch before update on public.bakery_inventory_items
  for each row execute function public.bakery_touch_updated_at();

create table if not exists public.bakery_inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.bakery_inventory_items (id) on delete cascade,
  change numeric not null,
  reason text not null default 'adjust'
    check (reason in ('receive', 'use', 'waste', 'adjust', 'sale', 'count')),
  note text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists bakery_inventory_tx_item_idx on public.bakery_inventory_transactions (item_id, created_at desc);

-- Keep quantity in sync with the transaction log.
create or replace function public.bakery_apply_inventory_tx()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.bakery_inventory_items set quantity = quantity + new.change where id = new.item_id;
  return new;
end $$;
revoke execute on function public.bakery_apply_inventory_tx() from public, anon, authenticated;

drop trigger if exists bakery_inventory_tx_apply on public.bakery_inventory_transactions;
create trigger bakery_inventory_tx_apply after insert on public.bakery_inventory_transactions
  for each row execute function public.bakery_apply_inventory_tx();

-- ---------------------------------------------------------------------------
-- Row level security
--   Public (anon + signed-in): read active products, public recipes,
--   ingredients, featured items, site content.
--   Site admins: write everything, and the only ones who see inventory.
-- ---------------------------------------------------------------------------
alter table public.bakery_site_content enable row level security;
alter table public.bakery_ingredients enable row level security;
alter table public.bakery_recipes enable row level security;
alter table public.bakery_recipe_ingredients enable row level security;
alter table public.bakery_products enable row level security;
alter table public.bakery_featured_items enable row level security;
alter table public.bakery_inventory_items enable row level security;
alter table public.bakery_inventory_transactions enable row level security;

drop policy if exists "bakery_site_content read" on public.bakery_site_content;
drop policy if exists "bakery_ingredients read" on public.bakery_ingredients;
drop policy if exists "bakery_recipes read" on public.bakery_recipes;
drop policy if exists "bakery_recipe_ingredients read" on public.bakery_recipe_ingredients;
drop policy if exists "bakery_products read" on public.bakery_products;
drop policy if exists "bakery_featured read" on public.bakery_featured_items;
drop policy if exists "bakery_site_content admin write" on public.bakery_site_content;
drop policy if exists "bakery_ingredients admin write" on public.bakery_ingredients;
drop policy if exists "bakery_recipes admin write" on public.bakery_recipes;
drop policy if exists "bakery_recipe_ingredients admin write" on public.bakery_recipe_ingredients;
drop policy if exists "bakery_products admin write" on public.bakery_products;
drop policy if exists "bakery_featured admin write" on public.bakery_featured_items;
drop policy if exists "bakery_inventory admin all" on public.bakery_inventory_items;
drop policy if exists "bakery_inventory tx admin all" on public.bakery_inventory_transactions;

-- public-readable content
create policy "bakery_site_content read" on public.bakery_site_content for select using (true);
create policy "bakery_ingredients read" on public.bakery_ingredients for select using (true);
create policy "bakery_recipes read" on public.bakery_recipes for select
  using (is_public or (select public.is_site_admin()));
create policy "bakery_recipe_ingredients read" on public.bakery_recipe_ingredients for select using (
  exists (
    select 1 from public.bakery_recipes r
    where r.id = recipe_id and (r.is_public or (select public.is_site_admin()))
  )
);
create policy "bakery_products read" on public.bakery_products for select
  using (is_active or (select public.is_site_admin()));
create policy "bakery_featured read" on public.bakery_featured_items for select using (true);

-- admin write on content tables
create policy "bakery_site_content admin write" on public.bakery_site_content for all
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));
create policy "bakery_ingredients admin write" on public.bakery_ingredients for all
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));
create policy "bakery_recipes admin write" on public.bakery_recipes for all
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));
create policy "bakery_recipe_ingredients admin write" on public.bakery_recipe_ingredients for all
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));
create policy "bakery_products admin write" on public.bakery_products for all
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));
create policy "bakery_featured admin write" on public.bakery_featured_items for all
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));

-- inventory: admin only
create policy "bakery_inventory admin all" on public.bakery_inventory_items for all
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));
create policy "bakery_inventory tx admin all" on public.bakery_inventory_transactions for all
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));

-- ---------------------------------------------------------------------------
-- Storage bucket for product / recipe photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('bakery-images', 'bakery-images', true)
on conflict (id) do nothing;

drop policy if exists "bakery images admin insert" on storage.objects;
drop policy if exists "bakery images admin update" on storage.objects;
drop policy if exists "bakery images admin delete" on storage.objects;

-- Public bucket: files are served by URL without a select policy, so none is
-- added (that would also let anyone list every file in the bucket).
create policy "bakery images admin insert" on storage.objects for insert
  with check (bucket_id = 'bakery-images' and (select public.is_site_admin()));
create policy "bakery images admin update" on storage.objects for update
  using (bucket_id = 'bakery-images' and (select public.is_site_admin()));
create policy "bakery images admin delete" on storage.objects for delete
  using (bucket_id = 'bakery-images' and (select public.is_site_admin()));
