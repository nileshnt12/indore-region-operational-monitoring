create or replace function public.replace_office_master(rows_payload jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  delete from public.office_master;

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
