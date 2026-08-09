import { createClient as createAdminClient } from "@supabase/supabase-js";

/** Cliente con service role — bypassa RLS por completo. SIEMPRE debe usarse
 * scopeado a un ID/valor ya resuelto server-side con el cliente normal
 * (sujeto a RLS), nunca a un parámetro que pueda venir directo del cliente. */
export const getAdminClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
