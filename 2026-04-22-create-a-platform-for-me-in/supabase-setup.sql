create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'employee' check (role in ('manager', 'employee')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'employee')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.categories (
  name text primary key
);

create table if not exists public.items (
  id uuid primary key,
  name text not null,
  category text not null,
  unit text not null,
  unit_type text not null,
  price numeric not null default 0,
  price_basis text not null,
  on_hand numeric not null default 0,
  ideal numeric not null default 0,
  weight_per_box numeric not null default 0,
  pieces_per_box numeric not null default 0,
  is_finished_product boolean not null default false,
  is_box_tracked boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_entries (
  id uuid primary key,
  item_id uuid not null references public.items(id) on delete cascade,
  delta numeric not null,
  inventory_delta numeric not null,
  type text not null check (type in ('consumed', 'wasted')),
  business_day date not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.order_queue (
  id uuid primary key,
  item_id uuid not null references public.items(id) on delete cascade,
  qty numeric not null,
  source text,
  business_day date not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.day_snapshots (
  id bigint generated always as identity primary key,
  business_day date not null,
  item_id uuid not null references public.items(id) on delete cascade,
  opening_qty numeric not null default 0,
  used_qty numeric not null default 0,
  wasted_qty numeric not null default 0,
  closing_qty numeric not null default 0,
  day_type text,
  special_tag text,
  special_event_name text
);

create table if not exists public.forecast_overrides (
  id bigint generated always as identity primary key,
  business_day date not null,
  item_id uuid not null references public.items(id) on delete cascade,
  override_ideal numeric not null,
  reason text,
  event_name text,
  event_date date,
  note text,
  created_by uuid references auth.users(id),
  unique (business_day, item_id)
);

create table if not exists public.closed_days (
  business_day date primary key,
  usage_cost numeric not null default 0,
  waste_cost numeric not null default 0,
  order_lines integer not null default 0
);

create table if not exists public.app_settings (
  id integer primary key,
  current_day date,
  day_type text,
  special_tag text,
  special_event_name text,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, current_day, day_type, special_tag, special_event_name)
values (1, current_date, 'weekday', '', '')
on conflict (id) do nothing;

insert into public.categories (name)
values
  ('Mithai'),
  ('Produce'),
  ('Dairy'),
  ('Curries'),
  ('Snacks'),
  ('Dessert'),
  ('Grocery'),
  ('Janitorial'),
  ('Take Out Containers'),
  ('Sauces')
on conflict (name) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.inventory_entries enable row level security;
alter table public.order_queue enable row level security;
alter table public.day_snapshots enable row level security;
alter table public.forecast_overrides enable row level security;
alter table public.closed_days enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id);

drop policy if exists "categories_all_authenticated" on public.categories;
create policy "categories_all_authenticated"
on public.categories
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "items_all_authenticated" on public.items;
create policy "items_all_authenticated"
on public.items
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "entries_all_authenticated" on public.inventory_entries;
create policy "entries_all_authenticated"
on public.inventory_entries
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "order_queue_all_authenticated" on public.order_queue;
create policy "order_queue_all_authenticated"
on public.order_queue
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "day_snapshots_all_authenticated" on public.day_snapshots;
create policy "day_snapshots_all_authenticated"
on public.day_snapshots
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "forecast_overrides_all_authenticated" on public.forecast_overrides;
create policy "forecast_overrides_all_authenticated"
on public.forecast_overrides
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "closed_days_all_authenticated" on public.closed_days;
create policy "closed_days_all_authenticated"
on public.closed_days
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "app_settings_all_authenticated" on public.app_settings;
create policy "app_settings_all_authenticated"
on public.app_settings
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.inventory_entries;
alter publication supabase_realtime add table public.order_queue;
alter publication supabase_realtime add table public.day_snapshots;
alter publication supabase_realtime add table public.forecast_overrides;
alter publication supabase_realtime add table public.closed_days;
alter publication supabase_realtime add table public.app_settings;
