-- Kathryn's Bakery – initial schema
-- Run in Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles / roles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Site content (About us / Our mission)
-- ---------------------------------------------------------------------------
create table if not exists public.site_content (
  key text primary key,
  title text not null default '',
  body text not null default '',
  updated_at timestamptz not null default now()
);
create trigger site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Ingredients
-- ---------------------------------------------------------------------------
create table if not exists public.ingredients (
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
create table if not exists public.recipes (
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
create trigger recipes_touch before update on public.recipes
  for each row execute function public.touch_updated_at();

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  quantity numeric,
  unit text,
  note text,
  position int not null default 0
);
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  description text,
  price numeric(10, 2),
  image_url text,
  recipe_id uuid references public.recipes (id) on delete set null,
  shelf_life_days int,
  net_weight text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Featured this week
-- ---------------------------------------------------------------------------
create table if not exists public.featured_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  starts_on date not null default current_date,
  ends_on date not null default (current_date + 6),
  blurb text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

-- ---------------------------------------------------------------------------
-- Inventory (admin only)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  category text not null default 'ingredient'
    check (category in ('ingredient', 'packaging', 'finished_good', 'supply')),
  ingredient_id uuid references public.ingredients (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
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
create trigger inventory_items_touch before update on public.inventory_items
  for each row execute function public.touch_updated_at();

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items (id) on delete cascade,
  change numeric not null,
  reason text not null default 'adjust'
    check (reason in ('receive', 'use', 'waste', 'adjust', 'sale', 'count')),
  note text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists inventory_tx_item_idx on public.inventory_transactions (item_id, created_at desc);

-- Keep quantity in sync with the transaction log.
create or replace function public.apply_inventory_tx()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.inventory_items set quantity = quantity + new.change where id = new.item_id;
  return new;
end $$;

drop trigger if exists inventory_tx_apply on public.inventory_transactions;
create trigger inventory_tx_apply after insert on public.inventory_transactions
  for each row execute function public.apply_inventory_tx();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.products enable row level security;
alter table public.featured_items enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;

-- profiles: users read their own row, admins read/update all
create policy "profiles self read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles admin update" on public.profiles for update using (public.is_admin());

-- public-readable content
create policy "site_content read" on public.site_content for select using (true);
create policy "ingredients read" on public.ingredients for select using (true);
create policy "recipes read" on public.recipes for select using (is_public or public.is_admin());
create policy "recipe_ingredients read" on public.recipe_ingredients for select using (
  exists (select 1 from public.recipes r where r.id = recipe_id and (r.is_public or public.is_admin()))
);
create policy "products read" on public.products for select using (is_active or public.is_admin());
create policy "featured read" on public.featured_items for select using (true);

-- admin write on content tables
create policy "site_content admin write" on public.site_content for all using (public.is_admin()) with check (public.is_admin());
create policy "ingredients admin write" on public.ingredients for all using (public.is_admin()) with check (public.is_admin());
create policy "recipes admin write" on public.recipes for all using (public.is_admin()) with check (public.is_admin());
create policy "recipe_ingredients admin write" on public.recipe_ingredients for all using (public.is_admin()) with check (public.is_admin());
create policy "products admin write" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "featured admin write" on public.featured_items for all using (public.is_admin()) with check (public.is_admin());

-- inventory: admin only
create policy "inventory admin all" on public.inventory_items for all using (public.is_admin()) with check (public.is_admin());
create policy "inventory tx admin all" on public.inventory_transactions for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket for product / recipe photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('images', 'images', true)
on conflict (id) do nothing;

create policy "images public read" on storage.objects for select using (bucket_id = 'images');
create policy "images admin insert" on storage.objects for insert with check (bucket_id = 'images' and public.is_admin());
create policy "images admin update" on storage.objects for update using (bucket_id = 'images' and public.is_admin());
create policy "images admin delete" on storage.objects for delete using (bucket_id = 'images' and public.is_admin());
