/**
 * Supabase 서버 전용 클라이언트.
 * API Routes 등 서버에서만 사용. 환경 변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "[supabase] SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다. DB 연동이 비활성화됩니다."
  );
}

export const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
      })
    : (null as unknown as ReturnType<typeof createClient>);

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceRoleKey);
}
