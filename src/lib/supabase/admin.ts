import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/** Cliente con service role — bypassa RLS por completo. SIEMPRE debe usarse
 * scopeado a un ID/valor ya resuelto server-side con el cliente normal
 * (sujeto a RLS), nunca a un parámetro que pueda venir directo del cliente. */
export const getAdminClient = () => {
  const { url, serviceRoleKey } = getSupabaseEnv();
  return createAdminClient(url, serviceRoleKey);
};
