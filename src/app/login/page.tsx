"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginAction } from "./actions";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const FEATURES = [
  "Gestión completa de pacientes",
  "Agenda y citas en tiempo real",
  "Historial clínico digital",
  "Archivos e imágenes dental",
];

const TEST_USERS = [
  { email: "superadmin2026@gmail.com", password: "SuperAdmin2026", name: "Juan Pablo Escalante", rol: "SuperAdmin (S1)", color: "bg-slate-200 text-slate-700" },
  { email: "israjm19@gmail.com", password: "M@ria10ijmrasmr", name: "María Isabel Gutiérrez", rol: "Admin (S1)", color: "bg-amber-100 text-amber-700" },
  { email: "admin1sede2@gmail.com", password: "Admin1Sede2", name: "Luis Fernando López", rol: "Admin (S2)", color: "bg-amber-100 text-amber-700" },
  { email: "escalinza14@gmail.com", password: "Takemy2026", name: "Dr. Carlos Rodríguez", rol: "Doctor (S1)", color: "bg-cyan-100 text-cyan-700" },
  { email: "doctor2sede1@gmail.com", password: "Doctor2Sede1", name: "Dr. Miguel Ángel Díaz", rol: "Doctor (S1)", color: "bg-cyan-100 text-cyan-700" },
  { email: "doctor3sede1@gmail.com", password: "Doctor3Sede1", name: "Dr. Marco Torres", rol: "Doctor (S1)", color: "bg-cyan-100 text-cyan-700" },
  { email: "doctor1sede2@gmail.com", password: "Doctor1Sede2", name: "Dr. José María Romero", rol: "Doctor (S2)", color: "bg-cyan-100 text-cyan-700" },
  { email: "doctor2sede2@gmail.com", password: "Doctor2Sede2", name: "Dr. Santiago Castro", rol: "Doctor (S2)", color: "bg-cyan-100 text-cyan-700" },
  { email: "doctor3sede2@gmail.com", password: "Doctor3Sede2", name: "Dr. Carlos Mendoza", rol: "Doctor (S2)", color: "bg-cyan-100 text-cyan-700" },
  { email: "almen042919@gmail.com", password: "Almen2029", name: "Ana Patricia Fernández", rol: "Cajero (S1)", color: "bg-emerald-100 text-emerald-700" },
  { email: "cajero1sede2@gmail.com", password: "Cajero1Sede2", name: "Rosa María Chávez", rol: "Cajero (S2)", color: "bg-emerald-100 text-emerald-700" },
  { email: "cajero2sede2@gmail.com", password: "Cajero2Sede2", name: "María Fernanda Salazar", rol: "Cajero (S2)", color: "bg-emerald-100 text-emerald-700" },
  { email: "t1513300521@gmail.com", password: "J@elito12", name: "José Luis Martínez", rol: "Asistente (S1)", color: "bg-blue-100 text-blue-700" },
  { email: "asistente1sede2@gmail.com", password: "Asistente1Sede2", name: "Laura Patricia Ramos", rol: "Asistente (S2)", color: "bg-blue-100 text-blue-700" },
];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRemember, setIsRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("error") === "desactivado") {
      setError("Tu sesión se cerró porque tu cuenta ha sido desactivada por el administrador.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const remember = formData.get("remember");
    const email = formData.get("email") as string;

    if (remember) {
      localStorage.setItem("mara_dental_remembered_email", email);
      localStorage.setItem("mara_dental_remember_option", "true");
    } else {
      localStorage.removeItem("mara_dental_remembered_email");
      localStorage.removeItem("mara_dental_remember_option");
    }

    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  function fillTestUser(u: (typeof TEST_USERS)[0]) {
    setEmail(u.email);
    setPassword(u.password);
    setError(null);
  }

  useEffect(()=>{
    if(localStorage.getItem("mara_dental_remembered_email")){
      setEmail(localStorage.getItem("mara_dental_remembered_email") as string);
    }

    if(localStorage.getItem("mara_dental_remember_option")){
      setIsRemember(true);
    }
  },[])

  return (
    <div className="h-screen min-h-screen min-w-0 flex bg-slate-50 overflow-x-hidden">
      {/* Panel izquierdo — formulario */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col items-center justify-center px-5 sm:px-8 py-8 bg-white overflow-x-hidden overflow-y-auto no-scrollbar">
        <div className="w-full max-w-90 py-4">

          {/* Título */}
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="mb-5"
            >
              <h1 className="text-[22px] font-bold text-slate-900">Bienvenido de nuevo</h1>
              <p className="mt-1 text-sm text-slate-500">Ingresa tus credenciales para continuar</p>
            </motion.div>
          </AnimatePresence>

          {/* Formulario */}
          <form className="space-y-3" onSubmit={handleSubmit}>
            <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}>
              <Field
                icon={<Mail size={15} />}
                placeholder="Correo electrónico"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
              />
            </motion.div>

            <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock size={15} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Contraseña"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </motion.div>

            <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}>
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" name="remember" checked={isRemember} onChange={() => setIsRemember(!isRemember)} className="h-4 w-4 rounded border-slate-300 accent-cyan-600 cursor-pointer" />
                  <span className="text-sm text-slate-600">Recordarme</span>
                </label>
                <a href="#" className="text-sm text-cyan-600 hover:text-cyan-700 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
                    <AlertCircle size={14} className="shrink-0" />
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-70 text-white rounded-xl h-10 text-sm font-semibold gap-2 transition-all shadow-sm shadow-cyan-200/60 cursor-pointer"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : (
                  <>Iniciar sesión <ArrowRight size={15} /></>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Accesos de prueba por rol */}
          <motion.div custom={7} initial="hidden" animate="visible" variants={fadeUp} className="mt-5">
            <p className="text-[11px] font-medium text-slate-400 mb-2.5 text-center tracking-wide uppercase">
              Accesos de prueba
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
              {TEST_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => fillTestUser(u)}
                  className="group flex flex-col items-start gap-1 p-3 rounded-xl border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/60 hover:shadow-sm transition-all cursor-pointer text-left active:scale-[0.98]"
                >
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${u.color}`}>
                    {u.rol}
                  </span>
                  <p className="text-[11px] font-semibold text-slate-800 truncate w-full">{u.name}</p>
                  <p className="text-[9px] text-slate-400 truncate w-full font-mono">{u.email}</p>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.p custom={8} initial="hidden" animate="visible" variants={fadeUp} className="mt-4 text-center text-xs text-slate-400">
            ¿Problemas para ingresar?{" "}
            <a href="#" className="text-cyan-600 hover:underline transition-colors">Contacta al administrador</a>
          </motion.p>
        </div>
      </div>

      {/* Panel derecho — imagen + branding */}
      <div className="hidden lg:flex flex-col relative w-[52%] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/dental-clinic.jpg')" }} />
        <div className="absolute inset-0 bg-linear-to-br from-cyan-900/80 via-slate-900/60 to-teal-900/70" />

        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-white/80 text-sm font-medium">Sistema de gestión clínica</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            >
              <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                Tu clínica dental,<br />
                <span className="text-cyan-300">digitalizada.</span>
              </h2>
              <p className="text-white/70 text-base leading-relaxed mb-10 max-w-sm">
                Administra pacientes, agenda citas y gestiona historias clínicas desde un solo lugar.
              </p>
              <div className="space-y-3">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={f}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.08, duration: 0.4 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 size={17} className="text-cyan-400 shrink-0" />
                    <span className="text-white/85 text-sm">{f}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="text-white/40 text-xs">
            © {new Date().getFullYear()} Kumo Systems. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon, placeholder, type, autoComplete, value,name, onChange,
}: {
  icon: React.ReactNode;
  placeholder: string;
  type: string;
  autoComplete?: string;
  value?: string;
  name:string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
        {icon}
      </span>
      <input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        name={name}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-50"
      />
    </div>
  );
}
