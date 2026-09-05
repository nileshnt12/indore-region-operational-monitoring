# Indore Region Operational Monitoring

React dashboard for India Post Indore Region operational monitoring.

## Data Flow

The app is designed to avoid calling MIS from the browser during normal use.

1. GitHub Actions runs every night at `12:15 AM IST`.
2. The job fetches the previous day's report from `https://mis.cept.gov.in/CBS/CBSReports.aspx`.
3. It enriches office rows using `public/data/indore-region-master.json`, generated from `Indore Region.xlsx` Sheet 1.
4. The job upserts office master and daily transaction rows into Supabase.
5. The React UI reads report rows from Supabase.
6. If Supabase frontend env vars are missing, local development falls back to the Vite MIS proxy.

## Supabase Setup

Run `supabase/schema.sql` in the Supabase SQL editor before enabling the cron job.

Required GitHub repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Required frontend environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use `.env.example` as the local template.

## GitHub Actions

The workflow is defined at `.github/workflows/nightly-mis-fetch.yml`.

Schedule:

```txt
45 18 * * *
```

That is `12:15 AM IST`.

Manual run is also supported from GitHub Actions. Pass `report_date` in `YYYY-MM-DD` format to backfill a specific date.

## Local Development

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

Local URL:

```txt
http://127.0.0.1:5174/
```

## Manual MIS Fetch

After setting `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`:

```bash
npm run fetch:mis
```

To fetch a specific date:

```bash
REPORT_DATE=2026-08-25 npm run fetch:mis
```
