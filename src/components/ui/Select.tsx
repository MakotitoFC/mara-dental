"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icon";

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

// Alto máximo real del panel desplegado (coincide con max-h-48/sm:max-h-56 de
// abajo) — se usa para decidir si abrir hacia arriba cuando no cabe debajo.
const MENU_MAX_HEIGHT = 224;

/** Dropdown con diseño propio (el <select> nativo no permite estilizar su panel abierto). */
export function Select({
  value, onChange, options, placeholder = "Seleccionar…", className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  function handleToggle() {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow);
    }
    setOpen((o) => !o);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="w-full h-9 sm:h-10 flex items-center justify-between gap-2 border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] sm:text-[13px] text-left bg-white dark:bg-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
      >
        <span className={`flex items-center gap-1.5 truncate ${current ? "text-slate-800 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}`}>
          {current?.icon && <Icon name={current.icon} size={14} className="shrink-0 text-slate-400 dark:text-slate-500" />}
          {current?.label ?? placeholder}
        </span>
        <Icon name="expand_more" size={16} className={`text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: openUpward ? 4 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.preventDefault()}
          className={`absolute left-0 right-0 ${openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"} z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 max-h-48 sm:max-h-56 overflow-y-auto no-scrollbar touch-pan-y`}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => { onChange(o.value); setOpen(false); }}
              className={`w-full flex items-center gap-1.5 text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] sm:text-[13px] transition-colors ${
                o.value === value ? "text-cyan-700 dark:text-cyan-400 font-semibold bg-cyan-50/70 dark:bg-cyan-900/30" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {o.icon && <Icon name={o.icon} size={14} className="shrink-0" />}
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
