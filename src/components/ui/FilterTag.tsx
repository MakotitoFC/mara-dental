"use client";

import { forwardRef, type ReactNode } from "react";
import { Icon } from "./Icon";

interface FilterTagProps {
  /** Texto del filtro activo (ej: "Blanqueamiento", "Dr. Díaz"). */
  label: ReactNode;
  /** Quita SOLO este filtro — nunca cierra ni afecta a los demás. Si se
      omite, el tag queda de solo lectura (sin "X") — reservado para valores
      que no tienen un estado "sin aplicar" real al que volver. */
  onRemove?: () => void;
  /** Si se pasa, el tag actúa como un select desplegable: se ve el chevron
      "˅" y el cuerpo es clickeable para abrir su selector de opciones. */
  onClick?: () => void;
  /** Punto de color en vez de ícono (ej: color del tipo de consulta). */
  dot?: string;
  /** Ícono en vez de punto de color. */
  icon?: string;
  className?: string;
}

/** Tag/pill unificado para TODO filtro activo del sistema — estilo "neon
 * cian" plano: SIN box-shadow/glow, solo borde cian + fondo translúcido +
 * texto cian. Compacto (h-7, texto xs). Si `onClick` viene, se comporta como
 * un select (chevron a la derecha, abre su dropdown de opciones). Compatible
 * como trigger de SmartPopover: acepta un ref callback normal. */
export const FilterTag = forwardRef<HTMLDivElement, FilterTagProps>(function FilterTag(
  { label, onRemove, onClick, dot, icon, className = "" },
  ref
) {
  return (
    <div
      ref={ref}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
 className={`inline-flex items-center gap-1 h-7 pl-2.5 ${onRemove ? "pr-1.5" : "pr-2.5"} rounded-full text-xs font-medium bg-cyan-500/5 text-cyan-600 border border-cyan-500/40 hover:bg-cyan-500/10 transition-colors shrink-0 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />}
      {icon && <Icon name={icon} size={14} className="shrink-0" />}
      <span className="truncate max-w-[140px]">{label}</span>
 {onClick && <Icon name="expand_more" size={14} className="shrink-0 text-cyan-500/70"/>}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
 className="shrink-0 ml-0.5 text-cyan-600/70 hover:text-cyan-900 transition-colors"
          aria-label="Quitar filtro"
        >
          <Icon name="close" size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
});
