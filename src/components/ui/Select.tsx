"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icon";
import { SmartPopover } from "./SmartPopover";

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
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

  // La lista no muestra barra de scroll (no-scrollbar), así que sin una pista
  // visual no se nota que hay más opciones arriba/abajo: se miden aquí y se
  // dibujan como un difuminado sobre el borde correspondiente.
  const listRef = useRef<HTMLDivElement | null>(null);
  const [hint, setHint] = useState({ up: false, down: false });
  const updateHint = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const up = el.scrollTop > 2;
    const down = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setHint((h) => (h.up === up && h.down === down ? h : { up, down }));
  }, []);

  // Al abrir: centra la opción seleccionada dentro de la lista (solo mueve la
  // lista, nunca la página/modal de atrás) y calcula las pistas de scroll.
  // También engancha la rueda sobre el trazo del borde (ver abajo).
  const wheelCleanupRef = useRef<(() => void) | null>(null);
  const setListNode = useCallback((node: HTMLDivElement | null) => {
    wheelCleanupRef.current?.();
    wheelCleanupRef.current = null;
    listRef.current = node;
    if (!node) return;

    const sel = node.querySelector<HTMLElement>('[data-selected="true"]');
    if (sel) node.scrollTop = Math.max(0, sel.offsetTop - node.clientHeight / 2 + sel.offsetHeight / 2);
    updateHint();

    // La rueda sobre el borde de 1px del panel (que no es parte de la lista)
    // se reenvía a la lista y se cancela su efecto por defecto — con un
    // listener nativo no pasivo, porque el onWheel de React es pasivo y no
    // puede cancelar: sin esto la página de fondo se desplazaba.
    const outer = node.parentElement;
    if (outer) {
      const onWheel = (e: WheelEvent) => {
        if (e.target !== outer) return;
        e.preventDefault();
        node.scrollTop += e.deltaY;
      };
      outer.addEventListener("wheel", onWheel, { passive: false });
      wheelCleanupRef.current = () => outer.removeEventListener("wheel", onWheel);
    }
  }, [updateHint]);

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
          onMouseDown={(e) => { if (e.button === 0) e.preventDefault(); }}
          className="relative bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden overscroll-contain"
        >
          {/* max-h también limitado por el alto realmente disponible en pantalla
              (--popover-available-h, ver SmartPopover). overscroll-contain: al
              llegar al final, la rueda/el dedo no arrastra la página de fondo. */}
          <div
            ref={setListNode}
            onScroll={updateHint}
            className="relative py-1 overflow-y-auto overscroll-contain no-scrollbar touch-pan-y max-h-[min(12rem,var(--popover-available-h,12rem))] sm:max-h-[min(14rem,var(--popover-available-h,14rem))]"
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={o.disabled}
                data-selected={o.value === value ? "true" : undefined}
                onMouseDown={(e) => {
                  if (o.disabled || e.button !== 0) return;
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-1.5 text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] sm:text-[13px] transition-colors ${
                  o.disabled
                    ? "text-slate-400 bg-slate-50/70 cursor-not-allowed opacity-60"
                    : o.value === value
                    ? "text-cyan-700 font-semibold bg-cyan-50/70"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {o.icon && <Icon name={o.icon} size={14} className="shrink-0" />}
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
          {/* Pistas de "hay más": pointer-events-none para que la rueda sobre el
              difuminado siga llegando a la lista. */}
          {hint.up && <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white to-transparent" />}
          {hint.down && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-white to-transparent" />}
        </motion.div>
      </SmartPopover>
    </div>
  );
}
