"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { updatePasswordAction } from "../login/actions";

export default function ActualizarPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ActualizarPasswordContent />
    </Suspense>
  );
}

function ActualizarPasswordContent() {
  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDone, setSuccessDone] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 1. Escuchar eventos de autenticación de Supabase (especialmente PASSWORD_RECOVERY)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasValidSession(true);
        setVerifyingSession(false);
      }
    });

    async function checkSession() {
      try {
        // 2. Verificar si viene un error en el hash o en search params
        if (typeof window !== "undefined") {
          const hash = window.location.hash;
          if (hash.includes("error=")) {
            const hashParams = new URLSearchParams(hash.substring(1));
            const errorDesc = hashParams.get("error_description") || hashParams.get("error");
            if (errorDesc) {
              setError(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
              setVerifyingSession(false);
              return;
            }
          }

          // 3. Verificar si viene un código PKCE en la URL (?code=...)
          const searchParams = new URLSearchParams(window.location.search);
          const code = searchParams.get("code");
          if (code) {
            const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            if (!exchangeErr) {
              if (mounted) {
                setHasValidSession(true);
                setVerifyingSession(false);
              }
              return;
            } else {
              console.warn("[actualizar-password] Error intercambiando código:", exchangeErr.message);
            }
          }
        }

        // 4. Verificar sesión existente
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (mounted) setHasValidSession(true);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (mounted) setHasValidSession(!!user);
        }
      } catch {
        if (mounted) setHasValidSession(false);
      } finally {
        if (mounted) setVerifyingSession(false);
      }
    }

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const hasMinLength = password.length >= 6;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasMinLength) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!hasLower) {
      setError("La contraseña debe incluir al menos una letra minúscula (a-z).");
      return;
    }
    if (!hasUpper) {
      setError("La contraseña debe incluir al menos una letra mayúscula (A-Z).");
      return;
    }
    if (!hasNumber) {
      setError("La contraseña debe incluir al menos un número o dígito (0-9).");
      return;
    }
    if (!hasSymbol) {
      setError("La contraseña debe incluir al menos un símbolo o carácter especial (!@#$%...).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden. Por favor verifícalas.");
      return;
    }

    setLoading(true);

    try {
      // 1. Intentar actualizar mediante el cliente Supabase
      const { error: clientError } = await supabase.auth.updateUser({ password });

      if (clientError) {
        // Fallback a server action si el cliente falla
        const formData = new FormData();
        formData.set("password", password);
        formData.set("confirmPassword", confirmPassword);
        const serverRes = await updatePasswordAction(formData);

        if (serverRes?.error) {
          setError(serverRes.error);
          setLoading(false);
          return;
        }
      }

      setSuccessDone(true);
      toast.success("Tu contraseña ha sido restablecida exitosamente.", {
        title: "Contraseña actualizada",
        duration: 3000,
      });

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("Ocurrió un error inesperado al actualizar la contraseña.");
      setLoading(false);
    }
  }

  if (verifyingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-cyan-600" />
          <p className="text-xs text-slate-500 font-medium">Verificando sesión de seguridad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-x-hidden">
      {/* Panel izquierdo */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-8 bg-white overflow-y-auto">
        <div className="w-full max-w-sm py-4">
          
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-cyan-600 transition-colors mb-6 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Volver al inicio de sesión
          </Link>

          <div className="mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 mb-3">
              <Lock size={20} />
            </div>
            <h1 className="text-[22px] font-bold text-slate-900 leading-tight">
              Establecer nueva contraseña
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Ingresa tu nueva contraseña para acceder a la plataforma
            </p>
          </div>

          {!hasValidSession && !successDone ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Sesión no detectada o expirada</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                El enlace de recuperación es temporal o ya fue utilizado. Por favor solicita un nuevo código o enlace de recuperación.
              </p>
              <Button
                type="button"
                onClick={() => router.push("/recuperar-password")}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-9 text-xs font-semibold"
              >
                Solicitar recuperación de contraseña
              </Button>
            </div>
          ) : successDone ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6 text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">¡Contraseña actualizada!</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Tu clave ha sido cambiada de forma segura. Redirigiendo al inicio de sesión...
              </p>
              <Button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-9 text-xs font-semibold"
              >
                Ir a Iniciar Sesión ahora
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-600">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <div className="leading-snug">{error}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock size={15} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock size={15} />
                  </span>
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Reglas de contraseña requeridas */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2 text-xs text-slate-500">
                <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                  Requisitos de la contraseña:
                </p>

                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${hasMinLength ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span className={hasMinLength ? "text-slate-700 font-medium" : ""}>
                    Mínimo 6 caracteres
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${hasLower ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span className={hasLower ? "text-slate-700 font-medium" : ""}>
                    Al menos una letra minúscula (a-z)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${hasUpper ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span className={hasUpper ? "text-slate-700 font-medium" : ""}>
                    Al menos una letra mayúscula (A-Z)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${hasNumber ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span className={hasNumber ? "text-slate-700 font-medium" : ""}>
                    Al menos un número (0-9)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${hasSymbol ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span className={hasSymbol ? "text-slate-700 font-medium" : ""}>
                    Al menos un símbolo o carácter especial (!@#$%...)
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200/60">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${passwordsMatch ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span className={passwordsMatch ? "text-slate-700 font-medium" : ""}>
                    Ambas contraseñas coinciden
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-70 text-white rounded-xl h-10 text-sm font-semibold gap-2 transition-all shadow-xs shadow-cyan-200 cursor-pointer"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : "Actualizar contraseña"}
              </Button>
            </form>
          )}

        </div>
      </div>

      {/* Panel derecho — branding */}
      <div className="hidden lg:flex flex-col relative w-[50%] overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/dental-clinic.jpg')" }} />
        <div className="absolute inset-0 bg-linear-to-br from-cyan-950/85 via-slate-900/80 to-teal-950/80" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-white/80 text-sm font-medium">MaraDental • Seguridad</span>
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white mb-3">
              Protección de tus credenciales
            </h2>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              Al actualizar tu contraseña, todas tus sesiones activas previas serán invalidadas por seguridad y podrás ingresar con tu nueva clave.
            </p>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs text-xs text-white/80 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-medium">
                <ShieldCheck size={16} /> Recomendación de seguridad
              </div>
              <p className="text-white/60">
                Usa una contraseña que combine mayúsculas, minúsculas y números que no utilices en otros servicios.
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
