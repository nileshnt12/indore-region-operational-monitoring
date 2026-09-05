create extension if not exists pgcrypto;

create table if not exists public.office_master (
  id uuid primary key default gen_random_uuid(),
  office_id text,
  office_name text not null,
  normalized_office_name text not null unique,
  division text not null,
  sub_division text not null,
  circle text,
  region text,
  office_type text,
  pincode text,
  reporting_ho_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_office_transactions (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  circle text not null,
  region text not null,
  division text not null,
  sub_division text,
  office_name text not null,
  normalized_office_name text not null,
  sol_id text,
  rict_account_open integer not null default 0,
  rict_deposit integer not null default 0,
  rict_withdrawal integer not null default 0,
  savings_bank_transaction integer not null default 0,
  total_transaction integer not null default 0,
  total_deposit_amount numeric(14, 2) not null default 0,
  total_withdrawal_amount numeric(14, 2) not null default 0,
  source_url text not null default 'https://mis.cept.gov.in/CBS/CBSReports.aspx',
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_office_transactions_report_office_key unique (report_date, normalized_office_name)
);

create table if not exists public.mis_fetch_runs (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  status text not null check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_fetched integer not null default 0,
  error_message text
);

create index if not exists daily_office_transactions_report_date_idx
  on public.daily_office_transactions (report_date);

create index if not exists daily_office_transactions_division_idx
  on public.daily_office_transactions (division);

create index if not exists daily_office_transactions_sub_division_idx
  on public.daily_office_transactions (sub_division);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_office_master_updated_at on public.office_master;
create trigger set_office_master_updated_at
before update on public.office_master
for each row execute function public.set_updated_at();

drop trigger if exists set_daily_office_transactions_updated_at on public.daily_office_transactions;
create trigger set_daily_office_transactions_updated_at
before update on public.daily_office_transactions
for each row execute function public.set_updated_at();

alter table public.office_master enable row level security;
alter table public.daily_office_transactions enable row level security;
alter table public.mis_fetch_runs enable row level security;

drop policy if exists "Allow public read office master" on public.office_master;
create policy "Allow public read office master"
on public.office_master for select
to anon, authenticated
using (true);

drop policy if exists "Allow public read daily transactions" on public.daily_office_transactions;
create policy "Allow public read daily transactions"
on public.daily_office_transactions for select
to anon, authenticated
using (true);

drop policy if exists "Allow public read fetch runs" on public.mis_fetch_runs;
create policy "Allow public read fetch runs"
on public.mis_fetch_runs for select
to anon, authenticated
using (true);
