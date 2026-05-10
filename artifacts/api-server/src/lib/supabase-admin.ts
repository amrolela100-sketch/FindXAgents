import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn("[supabase-admin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — auth middleware disabled");
}

export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export async function verifySupabaseToken(authHeader?: string): Promise<{ userId: string; email: string } | null> {
  if (!supabaseAdmin || !authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? "" };
}
