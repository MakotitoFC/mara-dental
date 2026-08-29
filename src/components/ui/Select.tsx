"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icon";
import { SmartPopover } from "./SmartPopover";

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
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
    <div className={className}>
      <SmartPopover
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        matchWidth
        renderTrigger={(ref) => (
          <button
            ref={ref}
            type="button"
            onClick={() => setOpen((o) => !o)}
 className="w-full h-9 sm:h-10 flex items-center justify-between gap-2 border border-slate-300 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] sm:text-[13px] text-left bg-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 hover:border-slate-400 transition-colors"
          >
 <span className={`flex items-center gap-1.5 truncate ${current ? "text-slate-800" : "text-slate-400"}`}>
 {current?.icon && <Icon name={current.icon} size={14} className="shrink-0 text-slate-400"/>}
              {current?.label ?? placeholder}
            </span>
 <Icon name="expand_more" size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.preventDefault()}
 className="bg-white border border-slate-200 rounded-xl shadow-xl py-1 max-h-48 sm:max-h-56 overflow-y-auto no-scrollbar touch-pan-y"
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => { onChange(o.value); setOpen(false); }}
              className={`w-full flex items-center gap-1.5 text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] sm:text-[13px] transition-colors ${
 o.value === value ? "text-cyan-700 font-semibold bg-cyan-50/70" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {o.icon && <Icon name={o.icon} size={14} className="shrink-0" />}
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </motion.div>
      </SmartPopover>
    </div>
  );
}
