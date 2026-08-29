"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icon";
import { SmartPopover } from "./SmartPopover";

function parseHM(v?: string): { h: number; m: number } | null {
  if (!v) return null;
  const [h, m] = v.split(" : ").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

/** Selector de hora/minutos con diseño propio (el <input type="time"> nativo no se puede estilizar). */
export function TimePicker({
  value, onChange, placeholder = "Seleccionar hora…", className = "", minuteStep = 5, min, max,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  minuteStep?: number;
  min?: string;
  max?: string;
}) {
  const minHM = parseHM(min);
  const maxHM = parseHM(max);
  const current = parseHM(value);
  const [open, setOpen] = useState(false);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minColRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      hourColRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "center" });
      minColRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "center" });
    });
  }, [open]);

  const hours = Array.from({ length: 24 }, (_, i) => i)
    .filter((h) => (!minHM || h >= minHM.h) && (!maxHM || h <= maxHM.h));
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep)
    .filter((m) => {
      if (minHM && current?.h === minHM.h && m < minHM.m) return false;
      if (maxHM && current?.h === maxHM.h && m > maxHM.m) return false;
      return true;
    });

  function setHour(h: number) {
    onChange(`${String(h).padStart(2, "0")}:${String(current?.m ?? 0).padStart(2, "0")}`);
  }
  function setMinute(m: number) {
    onChange(`${String(current?.h ?? 0).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  return (
    <div className={className}>
      <SmartPopover
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom-end"
        renderTrigger={(ref) => (
          <button
            ref={ref}
            type="button"
            onClick={() => setOpen((o) => !o)}
 className="w-full flex items-center justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-left bg-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 hover:border-slate-300 transition-colors"
          >
 <span className={`flex items-center gap-1.5 truncate ${current ? "text-slate-800" : "text-slate-400"}`}>
 <Icon name="schedule" size={14} className="text-slate-400 shrink-0"/>
              {current ? `${String(current.h).padStart(2, "0")}:${String(current.m).padStart(2, "0")}` : placeholder}
            </span>
          </button>
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
 className="bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 flex gap-1.5"
        >
          <div ref={hourColRef} className="w-16 max-h-48 overflow-y-auto no-scrollbar flex flex-col gap-1 pr-1">
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                data-active={current?.h === h}
                onClick={() => setHour(h)}
                className={`px-2.5 py-2 rounded-lg text-[12.5px] text-center transition-colors ${
 current?.h === h ? "bg-cyan-600 text-white font-semibold" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {String(h).padStart(2, "0")}
              </button>
            ))}
          </div>
 <div className="w-px bg-slate-100"/>
          <div ref={minColRef} className="w-16 max-h-48 overflow-y-auto no-scrollbar flex flex-col gap-1 pl-1">
            {minutes.map((m) => (
              <button
                key={m}
                type="button"
                data-active={current?.m === m}
                onClick={() => setMinute(m)}
                className={`px-2.5 py-2 rounded-lg text-[12.5px] text-center transition-colors ${
 current?.m === m ? "bg-cyan-600 text-white font-semibold" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {String(m).padStart(2, "0")}
              </button>
            ))}
          </div>
        </motion.div>
      </SmartPopover>
    </div>
  );
}
