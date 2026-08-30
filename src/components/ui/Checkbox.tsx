import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

/** Checkbox estándar del sistema — misma fila con borde + cuadrito que se
 * llena de cian con un check, en vez de un <input type="checkbox"> nativo o
 * variantes sueltas. Mismo diseño en todo el sistema (ver admin/catalogo,
 * "Tratamiento Activo"). */
export function Checkbox({
  checked, onChange, label, className = "", disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left",
        className
      )}
    >
      <span
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked ? "bg-cyan-600 border-cyan-600" : "border-slate-300"
        }`}
      >
        {checked && <Icon name="check" size={13} className="text-white" />}
      </span>
      <span className="text-[13px] text-slate-700 font-medium">{label}</span>
    </button>
  );
}
