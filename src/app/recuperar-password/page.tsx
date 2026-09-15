"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordAction, verifyRecoveryOtpAction } from "../login/actions";

export default function RecuperarPasswordPage() {
  return (
    <Suspense fallback={null}>
      <RecuperarPasswordContent />
    </Suspense>
  );
}

function RecuperarPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const [mode, setMode] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam) {
      if (errParam === "enlace_invalido") {
        setError("El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.");
      } else {
        setError(decodeURIComponent(errParam));
      }
    }
  }, [searchParams]);

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Por favor ingresa tu correo electrónico.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // 1. Iniciar con el cliente de Supabase en el navegador para que el code_verifier de PKCE resida en el navegador
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      
      const { error: clientErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/callback?next=/actualizar-password`,
      });

      if (clientErr) {
        // Fallback a la Server Action
        const formData = new FormData();
        formData.set("email", email.trim());
        const res = await resetPasswordAction(formData);

        if (res?.error) {
          setError(res.error);
          return;
        }
      }

      setEmailSent(true);
      toast.success("Enlace enviado exitosamente a tu correo.", {
        title: "Correo enviado",
      });
    } catch {
      setError("Ocurrió un error inesperado al enviar el correo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !code.trim()) {
      setError("Por favor completa tu correo y el código de verificación.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "recovery",
      });

      if (verifyErr) {
        // Fallback a la Server Action
        const formData = new FormData();
        formData.set("email", email.trim());
        formData.set("token", code.trim());

        const res = await verifyRecoveryOtpAction(formData);
        if (res?.error) {
          setError(res.error);
          return;
        }
      }

      toast.success("Identidad verificada exitosamente.", {
        title: "Código válido",
      });
      router.push("/actualizar-password");
    } catch {
      setError("Ocurrió un error al verificar el código.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-x-hidden">
      {/* Panel izquierdo / central */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-8 bg-white overflow-y-auto">
        <div className="w-full max-w-sm py-4">
          
          {/* Volver */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-cyan-600 transition-colors mb-6 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Volver al inicio de sesión
          </Link>

          {/* Encabezado */}
          <div className="mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 mb-3">
              <KeyRound size={20} />
            </div>
            <h1 className="text-[22px] font-bold text-slate-900 leading-tight">
              Recuperar contraseña
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Verifica tu identidad para restablecer el acceso a tu cuenta
            </p>
          </div>

          {/* Selector de método de verificación */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode("email"); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "email"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Mail size={13} />
              Enlace por Correo
            </button>
            <button
              type="button"
              onClick={() => { setMode("code"); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "code"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldCheck size={13} />
              Código / OTP
            </button>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-600">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div className="leading-snug">{error}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modo 1: Enlace por correo */}
          {mode === "email" && (
            <div>
              {emailSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 text-center"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">¡Correo enviado!</h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    Hemos enviado las instrucciones a <strong className="text-slate-800">{email}</strong>. Revisa tu bandeja de entrada o spam.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      onClick={() => setMode("code")}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-9 text-xs font-semibold"
                    >
                      Ingresar código de verificación
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setEmailSent(false); }}
                      className="text-xs text-slate-500 hover:text-slate-700 underline pt-1"
                    >
                      ¿No lo recibiste? Enviar de nuevo
                    </button>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSendEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Correo registrado
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Mail size={15} />
                      </span>
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ejemplo@maradental.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-50"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-70 text-white rounded-xl h-10 text-sm font-semibold gap-2 transition-all shadow-xs shadow-cyan-200 cursor-pointer"
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : "Enviar enlace de recuperación"}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Modo 2: Código OTP / Authenticator */}
          {mode === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Correo registrado
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@maradental.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Código de verificación OTP (8 dígitos)
                  </label>
                  <span className="text-[11px] text-slate-400">Correo o Authenticator</span>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <ShieldCheck size={15} />
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="12345678"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-50"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Ingresa el código numérico recibido en tu correo o generado por tu aplicación autenticadora.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-70 text-white rounded-xl h-10 text-sm font-semibold gap-2 transition-all shadow-xs shadow-cyan-200 cursor-pointer"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : "Verificar código y continuar"}
              </Button>
            </form>
          )}

          {/* Ayuda adicional */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              ¿Problemas para acceder? Comunícate con la administración de la clínica.
            </p>
          </div>
        </div>
      </div>

      {/* Panel derecho — branding MaraDental */}
      <div className="hidden lg:flex flex-col relative w-[50%] overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/dental-clinic.jpg')" }} />
        <div className="absolute inset-0 bg-linear-to-br from-cyan-950/85 via-slate-900/80 to-teal-950/80" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-white/80 text-sm font-medium">MaraDental • Seguridad y Acceso</span>
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white mb-3">
              Recuperación segura de cuenta
            </h2>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              Protegemos la información médica y los datos de nuestros pacientes con autenticación cifrada punto a punto y protocolos de seguridad modernos.
            </p>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs text-xs text-white/80 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-medium">
                <ShieldCheck size={16} /> Verificación de identidad obligatoria
              </div>
              <p className="text-white/60">
                Nunca compartas tus códigos ni contraseñas con terceros. El personal de la clínica nunca te pedirá tu clave de acceso.
              </p>
            </div>
          </div>

          <div className="text-white/40 text-xs">
            © {new Date().getFullYear()} MaraDental. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}
