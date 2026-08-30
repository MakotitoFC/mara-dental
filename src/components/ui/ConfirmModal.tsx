"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";
import { TextInput } from "./TextInput";

export interface ConfirmOptions {
  /** Por defecto "¿Estás seguro? " */
  title?: string;
  /** Mensaje explicativo de las consecuencias de la acción. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Si se define, el usuario debe escribir exactamente este texto para habilitar la confirmación (ej. "ELIMINAR"). */
  requireText?: string;
  /** false = confirmación neutral (no destructiva); por defecto true (rojo/peligro). */
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

const fallbackConfirm = async () => false;
const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>)>(fallbackConfirm);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  return ctx || fallbackConfirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [inputValue, setInputValue] = useState("");

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setInputValue("");
      setPending({ ...opts, resolve });
    });
  }, []);

  function close(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  const danger = pending?.danger !== false;
  const requireText = pending?.requireText;
  const canConfirm = !requireText || inputValue === requireText;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => close(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
 className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full border border-slate-100 flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  danger
 ? "bg-red-50 text-red-500"
 :"bg-cyan-50 text-cyan-600"
                }`}
              >
                <Icon name={danger ? "warning" : "help"} size={24} />
              </div>
 <h3 className="text-[16px] font-bold text-slate-800 mb-1">
                {pending.title ?? "¿Estás seguro? "}
              </h3>
 <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
                {pending.message}
              </p>

              {requireText && (
                <div className="w-full mb-4 text-left">
 <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
 Escribe <span className="font-bold text-slate-700">{requireText}</span> para confirmar
                  </label>
                  <TextInput
                    autoFocus
                    variant="red"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && canConfirm) close(true); }}
                    placeholder={requireText}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={() => close(false)}
 className="py-2.5 rounded-xl text-[12px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  {pending.cancelLabel ?? "Cancelar"}
                </button>
                <button
                  onClick={() => close(true)}
                  disabled={!canConfirm}
                  className={`flex items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-[12px] font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${
                    danger ? "bg-red-600 hover:bg-red-700" : "bg-cyan-600 hover:bg-cyan-700"
                  }`}
                >
                  {danger && <Icon name="delete" size={13} />}
                  {pending.confirmLabel ?? (danger ? "Eliminar" : "Confirmar")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
