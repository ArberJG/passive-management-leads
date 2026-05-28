create table if not exists public.leads (
  id integer primary key,
  full_name text not null,
  first_name text,
  middle_initial text,
  last_name text,
  suffix text,
  phone text,
  phone_display text,
  email text,
  address_line1 text,
  city text,
  state text,
  zip text,
  zip4 text,
  county text,
  address text,
  income text,
  net_worth text
);

create table if not exists public.lead_statuses (
  lead_id integer primary key references public.leads(id) on delete cascade,
  stage integer not null default 0 check (stage between 0 and 5),
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.leads enable row level security;
alter table public.lead_statuses enable row level security;

drop policy if exists "Authenticated users can read leads" on public.leads;
create policy "Authenticated users can read leads"
on public.leads for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read statuses" on public.lead_statuses;
create policy "Authenticated users can read statuses"
on public.lead_statuses for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert statuses" on public.lead_statuses;
create policy "Authenticated users can insert statuses"
on public.lead_statuses for insert
to authenticated
with check (auth.uid() = updated_by);

drop policy if exists "Authenticated users can update statuses" on public.lead_statuses;
create policy "Authenticated users can update statuses"
on public.lead_statuses for update
to authenticated
using (true)
with check (auth.uid() = updated_by);

drop policy if exists "Authenticated users can delete statuses" on public.lead_statuses;
create policy "Authenticated users can delete statuses"
on public.lead_statuses for delete
to authenticated
using (true);

alter publication supabase_realtime add table public.lead_statuses;
