import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Reemplazo directo de <input>/<textarea> — mismo diseño en todo el sistema
 * (fondo blanco, borde gris, rounded-xl, anillo de foco), igual al que ya
 * usaba EditarPacienteModal.tsx (`inputCls`). `variant` solo cambia el color
 * del foco — para los pocos casos donde el color es semántico (validación de
 * error/advertencia), no para inconsistencias sin querer. */
export type TextInputVariant = "cyan" | "red" | "amber";

const BASE = "w-full border bg-white text-slate-800 rounded-xl px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:ring-2 transition-colors";

const VARIANT_STYLES: Record<TextInputVariant, string> = {
  cyan: "border-slate-200 focus:border-cyan-500 focus:ring-cyan-100",
  red: "border-slate-200 focus:border-red-500 focus:ring-red-100",
  amber: "border-slate-200 focus:border-amber-500 focus:ring-amber-100",
};

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: TextInputVariant;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { variant = "cyan", className, ...props },
  ref
) {
  return <input ref={ref} className={cn(BASE, VARIANT_STYLES[variant], className)} {...props} />;
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: TextInputVariant;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { variant = "cyan", className, ...props },
  ref
) {
  return <textarea ref={ref} className={cn(BASE, VARIANT_STYLES[variant], className)} {...props} />;
});
