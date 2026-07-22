create extension if not exists pgcrypto;

create table if not exists public.customers (
  email text primary key,
  plan text not null check (plan in ('demo', 'research', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkouts (
  id uuid primary key default gen_random_uuid(),
  email text not null references public.customers(email) on delete cascade,
  plan text not null check (plan in ('research', 'pro')),
  status text not null check (status in ('captured', 'test_mode')),
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  email text not null references public.customers(email) on delete cascade,
  name text not null,
  text text not null,
  status text not null,
  score integer not null check (score >= 0 and score <= 100),
  plan text not null check (plan in ('demo', 'research', 'pro')),
  analysis jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checkouts_email_created_at_idx
  on public.checkouts(email, created_at desc);

create index if not exists projects_email_updated_at_idx
  on public.projects(email, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.checkouts enable row level security;
alter table public.projects enable row level security;

drop policy if exists "Customers can read themselves" on public.customers;
create policy "Customers can read themselves"
on public.customers
for select
using (email = (auth.jwt() ->> 'email'));

drop policy if exists "Customers can read their checkouts" on public.checkouts;
create policy "Customers can read their checkouts"
on public.checkouts
for select
using (email = (auth.jwt() ->> 'email'));

drop policy if exists "Customers can read their projects" on public.projects;
create policy "Customers can read their projects"
on public.projects
for select
using (email = (auth.jwt() ->> 'email'));

drop policy if exists "Customers can insert their projects" on public.projects;
create policy "Customers can insert their projects"
on public.projects
for insert
with check (email = (auth.jwt() ->> 'email'));

drop policy if exists "Customers can update their projects" on public.projects;
create policy "Customers can update their projects"
on public.projects
for update
using (email = (auth.jwt() ->> 'email'))
with check (email = (auth.jwt() ->> 'email'));

drop policy if exists "Customers can delete their projects" on public.projects;
create policy "Customers can delete their projects"
on public.projects
for delete
using (email = (auth.jwt() ->> 'email'));
