create extension if not exists pgcrypto;

create table if not exists public.office_master (
  id uuid primary key default gen_random_uuid(),
  circle text,
  region text,
  division text not null,
  divisional_head text,
  divisional_head_mobile text,
  sub_division text not null,
  sub_divisional_head text,
  sub_divisional_head_mobile text,
  office_name text not null,
  office_id text,
  email_id text,
  office_type_desc text,
  pincode text,
  normalized_office_name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_office_transactions (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  office_name text not null,
  savings_bank_accounts_opened integer not null default 0,
  savings_bank_transactions integer not null default 0,
  pli_rpli_premium numeric(14, 2) not null default 0,
  speed_post_articles_booked integer not null default 0,
  parcel_articles_booked integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_office_transactions_report_office_key unique (report_date, office_name)
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

create index if not exists office_master_division_idx
  on public.office_master (division);

create index if not exists office_master_sub_division_idx
  on public.office_master (sub_division);

create index if not exists office_master_office_name_idx
  on public.office_master (office_name);

create index if not exists daily_office_transactions_report_date_idx
  on public.daily_office_transactions (report_date);

create index if not exists daily_office_transactions_office_name_idx
  on public.daily_office_transactions (office_name);

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

create or replace function public.replace_office_master(rows_payload jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  truncate table public.office_master;

  insert into public.office_master (
    circle,
    region,
    division,
    divisional_head,
    divisional_head_mobile,
    sub_division,
    sub_divisional_head,
    sub_divisional_head_mobile,
    office_name,
    office_id,
    email_id,
    office_type_desc,
    pincode,
    normalized_office_name
  )
  select distinct on (regexp_replace(lower(trim(row_data.office_name)), '[^a-z0-9]+', '', 'g'))
    nullif(trim(row_data.circle), ''),
    nullif(trim(row_data.region), ''),
    trim(row_data.division),
    nullif(trim(row_data.divisional_head), ''),
    nullif(trim(row_data.divisional_head_mobile), ''),
    trim(row_data.sub_division),
    nullif(trim(row_data.sub_divisional_head), ''),
    nullif(trim(row_data.sub_divisional_head_mobile), ''),
    trim(row_data.office_name),
    nullif(trim(row_data.office_id), ''),
    nullif(trim(row_data.email_id), ''),
    nullif(trim(row_data.office_type_desc), ''),
    nullif(trim(row_data.pincode), ''),
    regexp_replace(lower(trim(row_data.office_name)), '[^a-z0-9]+', '', 'g')
  from jsonb_to_recordset(rows_payload) as row_data(
    circle text,
    region text,
    division text,
    divisional_head text,
    divisional_head_mobile text,
    sub_division text,
    sub_divisional_head text,
    sub_divisional_head_mobile text,
    office_name text,
    office_id text,
    email_id text,
    office_type_desc text,
    pincode text
  )
  where nullif(trim(row_data.division), '') is not null
    and nullif(trim(row_data.sub_division), '') is not null
    and nullif(trim(row_data.office_name), '') is not null
  order by regexp_replace(lower(trim(row_data.office_name)), '[^a-z0-9]+', '', 'g'), row_data.office_name;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function public.replace_office_master(jsonb) to anon, authenticated;
