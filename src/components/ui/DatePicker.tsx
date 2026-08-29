"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icon";
import { SmartPopover } from "./SmartPopover";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MESES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s?: string) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** "YYYY-MM" (sin día) — usado por el modo mes-solamente. */
function parseYearMonth(s?: string) {
  if (!s) return null;
  const [y, m] = s.split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, 1);
}
function toYearMonth(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Selector de fecha con diseño propio (el <input type="date"> nativo no se
 * puede estilizar). `mode="month"` lo convierte en selector de solo
 * mes+año — abre directo en la grilla de meses (sin vista de días) y
 * `value`/`onChange` usan formato "YYYY-MM". */
export function DatePicker({
  value, onChange, placeholder = "Seleccionar fecha…", className = "", min, max, mode = "day",
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  min?: string;
  max?: string;
  mode?: "day" | "month";
}) {
  const selected = mode === "month" ? parseYearMonth(value) : parseISODate(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months" | "years">(mode === "month" ? "months" : "days");
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());
  const [yearBlockStart, setYearBlockStart] = useState(() => (selected ?? new Date()).getFullYear() - 5);

  useEffect(() => {
    if (open) {
      const base = selected ?? new Date();
      setViewDate(base);
      setView(mode === "month" ? "months" : "days");
      setYearBlockStart(base.getFullYear() - 5);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const minDate = parseISODate(min);
  const maxDate = parseISODate(max);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  function isDisabled(d: Date) {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  }

  function fmtDisplay(d: Date | null) {
    if (!d) return null;
    if (mode === "month") return d.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
    return d.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className={className}>
      <SmartPopover
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        renderTrigger={(ref) => (
          <button
            ref={ref}
            type="button"
            onClick={() => setOpen((o) => !o)}
 className="w-full h-9 sm:h-10 flex items-center justify-between gap-2 border border-slate-200 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] sm:text-[13px] text-left bg-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 hover:border-slate-300 transition-colors"
          >
 <span className={`flex items-center gap-1.5 truncate ${selected ? "text-slate-800" : "text-slate-400"}`}>
 <Icon name="calendar_today" size={14} className="text-slate-400 shrink-0"/>
              {selected ? fmtDisplay(selected) : placeholder}
            </span>
          </button>
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
 className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-[264px]"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => {
                if (view === "days") setViewDate(new Date(year, month - 1, 1));
                else if (view === "months") setViewDate(new Date(year - 1, month, 1));
                else setYearBlockStart((y) => y - 12);
              }}
 className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Icon name="chevron_left" size={16} />
            </button>

            {view === "days" && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setView("months")}
 className="text-[12.5px] font-semibold text-slate-700 hover:text-cyan-700 hover:bg-slate-50 rounded-md px-1.5 py-0.5 transition-colors">
                  {MESES[month]}
                </button>
                <button type="button" onClick={() => setView("years")}
 className="text-[12.5px] font-semibold text-slate-700 hover:text-cyan-700 hover:bg-slate-50 rounded-md px-1.5 py-0.5 transition-colors">
                  {year}
                </button>
              </div>
            )}
            {view === "months" && (
              <button type="button" onClick={() => setView("years")}
 className="text-[12.5px] font-semibold text-slate-700 hover:text-cyan-700 hover:bg-slate-50 rounded-md px-1.5 py-0.5 transition-colors">
                {year}
              </button>
            )}
            {view === "years" && (
 <span className="text-[12.5px] font-semibold text-slate-700">{yearBlockStart} – {yearBlockStart + 11}</span>
            )}

            <button
              type="button"
              onClick={() => {
                if (view === "days") setViewDate(new Date(year, month + 1, 1));
                else if (view === "months") setViewDate(new Date(year + 1, month, 1));
                else setYearBlockStart((y) => y + 12);
              }}
 className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Icon name="chevron_right" size={16} />
            </button>
          </div>

          {view === "days" && (
            <>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DIAS.map((d) => (
 <span key={d} className="text-[10px] font-bold text-slate-400 text-center py-1">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const iso = toISODate(d);
                  const isSelected = selected && iso === toISODate(selected);
                  const isToday = toISODate(d) === toISODate(today);
                  const disabled = isDisabled(d);
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={disabled}
                      onClick={() => { onChange(iso); setOpen(false); }}
                      className={`w-8 h-8 rounded-lg text-[12px] flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-cyan-600 text-white font-semibold"
                          : disabled
 ? "text-slate-300 cursor-not-allowed"
                          : isToday
 ? "text-cyan-700 font-semibold bg-cyan-50 hover:bg-cyan-100"
 :"text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {view === "months" && (
            <div className="grid grid-cols-3 gap-1.5">
              {MESES_CORTO.map((m, i) => {
                const isSelected = selected && selected.getFullYear() === year && selected.getMonth() === i;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      if (mode === "month") {
                        onChange(toYearMonth(new Date(year, i, 1)));
                        setOpen(false);
                      } else {
                        setViewDate(new Date(year, i, 1));
                        setView("days");
                      }
                    }}
                    className={`h-9 rounded-lg text-[12px] font-medium transition-colors ${
 isSelected ? "bg-cyan-600 text-white font-semibold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {view === "years" && (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => yearBlockStart + i).map((y) => {
                const isSelected = selected && selected.getFullYear() === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setViewDate(new Date(y, month, 1)); setView("months"); }}
                    className={`h-9 rounded-lg text-[12px] font-medium transition-colors ${
 isSelected ? "bg-cyan-600 text-white font-semibold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </SmartPopover>
    </div>
  );
}
