import type { OfficeMasterUploadRow } from '../types/masterData'
import { supabase } from './supabaseClient'

export async function replaceOfficeMaster(rows: OfficeMasterUploadRow[]) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }

  const { data, error } = await supabase.rpc('replace_office_master', {
    rows_payload: rows,
  })

  if (error) throw error
  return Number(data ?? rows.length)
}
