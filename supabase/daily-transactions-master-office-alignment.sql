alter table public.daily_office_transactions
  add column if not exists office_master_id uuid references public.office_master(id) on delete set null,
  add column if not exists source text not null default 'MIS',
  add column if not exists fetched_at timestamptz not null default now();

create index if not exists daily_office_transactions_office_master_date_idx
  on public.daily_office_transactions (office_master_id, report_date);

notify pgrst, 'reload schema';
