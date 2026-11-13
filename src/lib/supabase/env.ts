/** Resuelve las credenciales de Supabase según `MODO_BD` ("SANDBOX" | "PRODUCCION").
 * Si `MODO_BD` no está definido, usa "PRODUCCION" por defecto y hace fallback
 * a `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` por compatibilidad. */
export function getSupabaseEnv() {
  const modo = (process.env.MODO_BD || "PRODUCCION").trim().toUpperCase();
  const isSandbox = modo === "SANDBOX";
  const prefix = isSandbox ? "SANDBOX_SUPABASE" : "PRODUCCION_SUPABASE";

  const url =
    process.env[`${prefix}_URL`] ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const publishableKey =
    process.env[`${prefix}_PUBLISHABLE_KEY`] ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

  const serviceRoleKey =
    process.env[`${prefix}_SERVICE_ROLE_KEY`] ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  return { modo, isSandbox, url, publishableKey, serviceRoleKey };
}
