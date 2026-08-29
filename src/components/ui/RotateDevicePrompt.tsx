"use client";

import { motion } from "framer-motion";

/** Aviso de "gira tu dispositivo" para vistas que se aprovechan del modo
 * horizontal en mobile (editor de imágenes, gráficos ampliados, etc.).
 * Fondo negro traslúcido + ícono de teléfono animado rotando entre
 * vertical/horizontal, enmarcado por dos flechas curvas. Se puede
 * descartar tocando la pantalla. */
export function RotateDevicePrompt({
  onDismiss,
  message = "Gira tu dispositivo para continuar",
}: {
  onDismiss: () => void;
  message?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-110 flex flex-col items-center justify-center gap-6 bg-slate-900/40 backdrop-blur-[2px]"
      onClick={onDismiss}
    >
      <div className="relative w-30 h-30 flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full" fill="none">
          <path d="M 60 6 A 54 54 0 0 1 111 45" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <polygon points="111,45 102,36 118,32" fill="white" opacity="0.85" />
          <path d="M 60 114 A 54 54 0 0 1 9 75" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <polygon points="9,75 18,84 2,88" fill="white" opacity="0.85" />
        </svg>
        <motion.div
          className="w-11 h-19 rounded-[10px] border-[3px] border-white flex items-start justify-center pt-1.5"
          animate={{ rotate: [0, 90, 90, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.45, 0.85, 1], ease: "easeInOut" }}
        >
          <span className="w-3 h-0.5 rounded-full bg-white/90" />
        </motion.div>
      </div>
      <div className="flex flex-col items-center gap-1.5 px-10">
        <p className="text-white text-[13px] font-semibold text-center leading-relaxed">
          {message}
        </p>
        <p className="text-white/60 text-[11px] text-center">Toca la pantalla para continuar sin girar</p>
      </div>
    </div>
  );
}
