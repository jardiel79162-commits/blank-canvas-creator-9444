-- Core tables expected by the current app
create table if not exists public.profiles (
  user_id uuid primary key,
  display_name text,
  cpf text,
  credits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount_cents integer not null,
  credits_purchased integer not null,
  status text not null default 'pending',
  mp_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.remix_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_repo text not null,
  target_repo text not null,
  status text not null default 'processing',
  error_message text,
  logs text[],
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on public.profiles (user_id);
create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
create index if not exists idx_user_roles_user_id_role on public.user_roles (user_id, role);
create index if not exists idx_payments_user_created on public.payments (user_id, created_at desc);
create index if not exists idx_payments_status on public.payments (status);
create index if not exists idx_remix_history_user_created on public.remix_history (user_id, created_at desc);
create index if not exists idx_remix_history_status on public.remix_history (status);

-- Updated-at helper
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Admin helper for policies
create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = check_user_id
      and ur.role = 'admin'
  );
$$;

-- Triggers (idempotent)
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_payments_updated_at on public.payments;
create trigger update_payments_updated_at
before update on public.payments
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_remix_history_updated_at on public.remix_history;
create trigger update_remix_history_updated_at
before update on public.remix_history
for each row
execute function public.update_updated_at_column();

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.payments enable row level security;
alter table public.remix_history enable row level security;

-- profiles policies
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "profiles_insert_own_or_admin"
on public.profiles
for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "profiles_delete_own_or_admin"
on public.profiles
for delete
using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- user_roles policies
create policy "user_roles_select_own_or_admin"
on public.user_roles
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "user_roles_insert_admin_only"
on public.user_roles
for insert
with check (public.is_admin(auth.uid()));

create policy "user_roles_update_admin_only"
on public.user_roles
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "user_roles_delete_admin_only"
on public.user_roles
for delete
using (public.is_admin(auth.uid()));

-- payments policies
create policy "payments_select_own_or_admin"
on public.payments
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "payments_insert_own_or_admin"
on public.payments
for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "payments_update_own_or_admin"
on public.payments
for update
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "payments_delete_own_or_admin"
on public.payments
for delete
using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- remix_history policies
create policy "remix_history_select_own_or_admin"
on public.remix_history
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "remix_history_insert_own_or_admin"
on public.remix_history
for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "remix_history_update_own_or_admin"
on public.remix_history
for update
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "remix_history_delete_own_or_admin"
on public.remix_history
for delete
using (auth.uid() = user_id or public.is_admin(auth.uid()));