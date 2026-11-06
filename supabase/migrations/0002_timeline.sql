-- Kathryn's Bakery – Timeline of upcoming events
--
-- Events drop off the public site automatically once their last day has
-- passed (no cleanup job needed). The site filters on the visitor's local
-- date; RLS also hides anything more than a day old (one day of slack covers
-- the gap between UTC and US time zones). Admins can still see past events.
--
-- Run after 0001_init.sql. Safe to re-run.

create table if not exists public.bakery_timeline_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_on date not null,
  ends_on date,
  time_label text,
  location text,
  -- Last day the event is shown: its end date, or its start date for one-day events.
  last_day date generated always as (coalesce(ends_on, starts_on)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bakery_timeline_events_dates check (ends_on is null or ends_on >= starts_on)
);
create index if not exists bakery_timeline_events_last_day_idx
  on public.bakery_timeline_events (last_day, starts_on);

drop trigger if exists bakery_timeline_events_touch on public.bakery_timeline_events;
create trigger bakery_timeline_events_touch before update on public.bakery_timeline_events
  for each row execute function public.bakery_touch_updated_at();

alter table public.bakery_timeline_events enable row level security;

drop policy if exists "bakery_timeline read" on public.bakery_timeline_events;
drop policy if exists "bakery_timeline admin write" on public.bakery_timeline_events;

create policy "bakery_timeline read" on public.bakery_timeline_events for select
  using (last_day >= current_date - 1 or (select public.is_site_admin()));
create policy "bakery_timeline admin write" on public.bakery_timeline_events for all
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));
