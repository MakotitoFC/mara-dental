import type { NextConfig } from "next";
import path from "path";

const modoBd = (process.env.MODO_BD || "PRODUCCION").trim().toUpperCase();
const envPrefix = modoBd === "SANDBOX" ? "SANDBOX_SUPABASE" : "PRODUCCION_SUPABASE";
const supabaseUrl =
  process.env[`${envPrefix}_URL`] || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabasePublishableKey =
  process.env[`${envPrefix}_PUBLISHABLE_KEY`] ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins:['127.0.0.1'],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
