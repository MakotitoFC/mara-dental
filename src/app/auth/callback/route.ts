import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/actualizar-password";
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  // 1. Si Supabase envió un error en los query params
  if (error || error_description) {
    const msg = error_description || error || "enlace_invalido";
    return NextResponse.redirect(`${origin}/recuperar-password?error=${encodeURIComponent(msg)}`);
  }

  // 2. Si viene un código PKCE
  if (code) {
    try {
      const supabase = await createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!exchangeError) {
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${origin}${next}`);
        }
      }
      console.warn("[auth/callback] Falló exchangeCodeForSession en servidor, pasando código al cliente:", exchangeError.message);
    } catch (err) {
      console.error("[auth/callback] Error en intercambio de código:", err);
    }

    // Si falló en el servidor (p. ej. el code_verifier está en localStorage/cookie del cliente),
    // redirigir al cliente con el código para que el cliente lo resuelva con su propio contexto
    return NextResponse.redirect(`${origin}${next}?code=${encodeURIComponent(code)}`);
  }

  // 3. Si viene token_hash (flujo OTP email link)
  if (token_hash && type) {
    try {
      const supabase = await createClient();
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      });
      if (!otpError) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.warn("[auth/callback] Falló verifyOtp con token_hash:", otpError.message);
    } catch (err) {
      console.error("[auth/callback] Error en verifyOtp:", err);
    }
  }

  // 4. Si no hay parámetros visibles en el servidor (habitual cuando Supabase devuelve la sesión en el hash #access_token=...),
  // responder con HTML que captura window.location.hash y redirige a /actualizar-password preservando la sesión
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Verificando enlace...</title>
  <script>
    (function() {
      var hash = window.location.hash || '';
      var search = window.location.search || '';

      // Si Supabase incluyó la sesión en el fragmento hash
      if (hash && (hash.indexOf('access_token=') !== -1 || hash.indexOf('type=recovery') !== -1)) {
        window.location.replace('/actualizar-password' + hash);
        return;
      }

      // Si Supabase incluyó un error en el fragmento hash
      if (hash && hash.indexOf('error=') !== -1) {
        var params = new URLSearchParams(hash.substring(1));
        var desc = params.get('error_description') || params.get('error') || 'enlace_invalido';
        window.location.replace('/recuperar-password?error=' + encodeURIComponent(desc));
        return;
      }

      // Si hay error en search
      var sParams = new URLSearchParams(search);
      var sErr = sParams.get('error_description') || sParams.get('error');
      if (sErr) {
        window.location.replace('/recuperar-password?error=' + encodeURIComponent(sErr));
        return;
      }

      // Si no hay parámetros reconocibles, llevar a actualizar-password por si el cliente tiene sesión activa
      if (hash) {
        window.location.replace('/actualizar-password' + hash);
      } else {
        window.location.replace('/recuperar-password?error=enlace_invalido');
      }
    })();
  </script>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc;">
  <div style="text-align: center; color: #475569; padding: 20px;">
    <div style="width: 32px; height: 32px; border: 3px solid #0891b2; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px auto;"></div>
    <p style="font-size: 14px; font-weight: 500; margin: 0;">Verificando enlace de seguridad...</p>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
