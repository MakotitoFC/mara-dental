"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence,Variants } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginAction } from "./actions";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const},
  }),
};

const FEATURES = [
  "Gestión completa de pacientes",
  "Agenda y citas en tiempo real",
  "Historial clínico digital",
  "Archivos e imágenes dental",
];

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "register" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(()=>{
    const savedEmail = localStorage.getItem("mara_dental_remembered_email");
    if (savedEmail) {
      // Si usas un ref o controlas el input, lo setearías aquí. 
      // Por ahora, el navegador a menudo hace autocompletado, pero guardar 
      // la preferencia en localStorage es buena práctica.
    }
  },[]);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      setIsLoading(true);
  
      const formData = new FormData(e.currentTarget);
  
      if (tab === "login") {
        const remember = formData.get("remember");
        const email = formData.get("email") as string;

        if(remember){
          localStorage.setItem("mara_dental_remembered_email",email);
        }else{
          localStorage.removeItem("mara_dental_remembered_email")
        }
        const result = await loginAction(formData);
        
        if (result?.error) {
          setError(result.error);
          setIsLoading(false);
        }
      }else {
        // Aquí iría la lógica para registrar (signUp)
        console.log("Lógica de registro pendiente...");
        setIsLoading(false);
      }
    };



  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      {/* Panel izquierdo — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-white overflow-y-auto">
        <div className="w-full max-w-90 py-4">

          {/* Logo */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-8"
          >
            <Image
              src="/logo.png"
              alt="Mara Dental Group"
              width={180}
              height={48}
              className="object-contain"
              priority
            />
          </motion.div>

          {/* Título */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab + "-title"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="mb-6"
            >
              <h1 className="text-2xl font-bold text-slate-900">
                {tab === "login" ? "Bienvenido de nuevo" : "Crear cuenta"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {tab === "login"
                  ? "Ingresa tus credenciales para continuar"
                  : "Completa tus datos para empezar"}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Tabs */}
          <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 mb-6">
              {(["login", "register"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    tab === t
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t === "login" ? "Iniciar sesión" : "Crear cuenta"}
                </button>
              ))}
            </div>
          </motion.div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 text-sm rounded-xl text-center">
              {success}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <AnimatePresence>
              {tab === "register" && (
                <motion.div
                  key="nombre"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <Field icon={<User size={15} />} name="name" placeholder="Nombre completo" type="text" />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp}>
              <Field
                icon={<Mail size={15} />}
                placeholder="Correo electrónico"
                type="email"
                name="email"
                autoComplete="email"
              />
            </motion.div>

            <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock size={15} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  placeholder="Contraseña"
                  name="password"
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

            {tab === "login" && (
              <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}>
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="remember"
                      className="h-4 w-4 rounded border-slate-300 accent-cyan-600 cursor-pointer"
                    />
                    <span className="text-sm text-slate-600">Recordarme</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                    }}
                    className="text-sm text-cyan-600 hover:text-cyan-700 transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </motion.div>
            )}

            <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp} className="pt-1">
              <Button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-10 text-sm font-semibold gap-2 transition-all shadow-sm shadow-cyan-200/60 cursor-pointer"
              >
                {tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
                <ArrowRight size={15} />
              </Button>
            </motion.div>
          </form>

          {/* Separador */}
          <motion.div
            custom={6}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="my-5 flex items-center gap-3"
          >
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs text-slate-400">O continúa con</span>
            <div className="h-px flex-1 bg-slate-100" />
          </motion.div>

          {/* Google */}
          <motion.div custom={7} initial="hidden" animate="visible" variants={fadeUp}>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
          </motion.div>

          <motion.p
            custom={8}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-6 text-center text-xs text-slate-400"
          >
            ¿Problemas para ingresar?{" "}
            <a href="#" className="text-cyan-600 hover:underline transition-colors">
              Contacta al administrador
            </a>
          </motion.p>
        </div>
      </div>

      {/* Panel derecho — imagen + branding */}
      <div className="hidden lg:flex flex-col relative w-[52%] overflow-hidden">
        {/* Imagen de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/dental-clinic.jpg')" }}
        />
        {/* Overlay degradado */}
        <div className="absolute inset-0 bg-linear-to-br from-cyan-900/80 via-slate-900/60 to-teal-900/70" />

        {/* Contenido sobre la imagen */}
        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Badge top */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-white/80 text-sm font-medium">Sistema de gestión clínica</span>
          </div>

          {/* Texto central */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
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

          {/* Footer */}
          <div className="text-white/40 text-xs">
            © {new Date().getFullYear()} Mara Dental Group. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  placeholder,
  type,
  autoComplete,
  name
}: {
  icon: React.ReactNode;
  placeholder: string;
  type: string;
  autoComplete?: string;
  name:string;
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
        name={name}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-50"
      />
    </div>
  );
}
