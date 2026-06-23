"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { getOdontogramasAction } from "../../../[id]/odontograma.actions";

const fmt = (d: string) => { try { return new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }); } catch { return d; } };

export function OdontogramaComparador({ pacienteId }: { pacienteId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selId, setSelId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getOdontogramasAction(String(pacienteId)).then(data => {
      if (alive) { setSessions(data || []); setLoading(false); }
    });
    return () => { alive = false; };
  }, [pacienteId]);

  const sel = sessions.find(s => s.id === selId);

  return (
    <div className="bg-cyan-50/50 border border-cyan-100 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 text-cyan-700 shrink-0">
          <Icon name="history" size={17} />
          <span className="text-[13px] font-semibold">Comparar con</span>
        </div>
        <select
          value={selId}
          onChange={e => setSelId(e.target.value)}
          disabled={loading || sessions.length === 0}
          className="flex-1 min-w-0 border border-cyan-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 bg-white disabled:opacity-50"
        >
          <option value="">{loading ? "Cargando…" : sessions.length === 0 ? "Sin evaluaciones previas" : "Estado actual (ninguna)"}</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{fmt(s.fecha)} — {s.service || "evaluación"}</option>
          ))}
        </select>
      </div>

      {sel && (
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Estado al {fmt(sel.fecha)}
          </p>
          {(!sel.findings || sel.findings.length === 0) ? (
            <p className="text-[12px] text-slate-400 italic">Sin hallazgos registrados en esa evaluación.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sel.findings.map((f: any) => {
                const cond = f.isAll
                  ? f.allConvention
                  : (f.surfaceConditions || []).map((c: any) => c.convention).join(", ");
                return (
                  <div key={f.id} className="flex items-start justify-between gap-3 text-[12.5px] py-1 border-b border-slate-50 last:border-0">
                    <span className="font-semibold text-slate-700 shrink-0">Pieza {f.toothNumber}</span>
                    <span className="text-slate-500 text-right">
                      {cond || "—"}{f.observaciones ? ` · ${f.observaciones}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
