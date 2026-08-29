"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icon";
import { SmartPopover } from "./SmartPopover";

export interface FilterCategoryMeta {
  label: string;
  icon: string;
}

/** Paso 1 del patrón de "filtro maestro" (Dashboard Directivo, Personal,
    Auditoría, Calendario): lista simple de categorías, SIN sus opciones
    internas — elegir una solo agrega/quita la categoría de `activeKeys`
    (aparece/desaparece su tag). Las opciones reales de cada categoría viven
    en el dropdown propio de su tag (ver TagDropdown), no acá.

    variant "icon": botón maestro (icono ☰ solo, sin texto — fondo gris
    sutil, nunca el estilo cian de un tag activo). variant "chip": "+
    Filtro" al final de la fila de tags (texto plano, sin fondo/borde). */
export function FilterCategoryPicker<K extends string>({
  variant, categories, activeKeys, onToggle,
}: {
  variant: "icon" | "chip";
  categories: Record<K, FilterCategoryMeta>;
  activeKeys: Set<K>;
  onToggle: (k: K) => void;
}) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(categories) as K[];

  return (
    <SmartPopover
      open={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      renderTrigger={(ref) =>
        variant === "icon" ? (
          <button
            ref={ref}
            type="button"
            onClick={() => setOpen((o) => !o)}
            title="Filtros"
            aria-label="Filtros"
            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              open || activeKeys.size > 0 ? "bg-cyan-50 text-cyan-600" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <Icon name="filter_lines" size={18} />
          </button>
        ) : (
          <button
            ref={ref}
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium bg-cyan-500/5 text-cyan-600 border border-cyan-500/40 hover:bg-cyan-500/10 transition-colors shrink-0"
          >
            <Icon name="add" size={14} className="shrink-0" />
            Filtro
          </button>
        )
      }
    >
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
 className="min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg py-1.5"
      >
        {keys.map((k) => {
          const active = activeKeys.has(k);
          return (
            <button
              key={k}
              type="button"
              onMouseDown={() => { onToggle(k); setOpen(false); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${active ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
            >
 <Icon name={categories[k].icon} size={15} className={active ? "text-cyan-600" : "text-slate-400"} />
              <span className="flex-1">{categories[k].label}</span>
 {active && <Icon name="check" size={14} className="text-cyan-600"/>}
            </button>
          );
        })}
      </motion.div>
    </SmartPopover>
  );
}
