"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icon";

export interface SelectOption {
  value: string;
  label: string;
}

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
  const current = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="w-full flex items-center justify-between gap-2 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-[13px] text-left bg-white dark:bg-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
      >
        <span className={`truncate ${current ? "text-slate-800 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}`}>{current?.label ?? placeholder}</span>
        <Icon name="expand_more" size={16} className={`text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 max-h-56 overflow-y-auto"
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                o.value === value ? "text-cyan-700 dark:text-cyan-400 font-semibold bg-cyan-50/70 dark:bg-cyan-900/30" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {o.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
