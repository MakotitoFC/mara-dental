"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

const fmtFull = (d: string) => { try { return new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }); } catch { return d; } };
const fmtHora = (d: string) => { try { return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const money = (n: number, m = "PEN") => `${m === "PEN" ? "S/" : m} ${Number(n).toFixed(2)}`;

const PLAN_CFG: Record<string, { bg: string; text: string; label: string }> = {
  hacer:    { bg: "bg-slate-100", text: "text-slate-600", label: "Por hacer" },
  haciendo: { bg: "bg-amber-100", text: "text-amber-700", label: "Haciendo" },
  hecho:    { bg: "bg-emerald-100", text: "text-emerald-700", label: "Hecho" },
};

export function HistorialView({ consultas }: { consultas: any[] }) {
  if (!consultas || consultas.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
        <Icon name="history" size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-[13px]">Este paciente aún no tiene consultas registradas.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {consultas.map((c, i) => <ConsultaCard key={c.id} consulta={c} defaultOpen={i === 0} />)}
    </div>
  );
}

function ConsultaCard({ consulta: c, defaultOpen }: { consulta: any; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Cabecera */}
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-slate-50/60 transition-colors">
        <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
          <Icon name="stethoscope" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">
            Consulta médica <span className="text-slate-300 font-medium">· {fmtFull(c.fecha)} · {fmtHora(c.fecha)}</span>
          </p>
          <p className="text-[15px] sm:text-[16px] font-bold text-slate-900 leading-snug mt-0.5 truncate">{c.motivo}</p>
          <p className="text-[12.5px] text-slate-500 truncate">{c.doctor}</p>
        </div>
        <Icon name={open ? "expand_less" : "expand_more"} size={22} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 sm:p-5 bg-slate-50/40 flex flex-col gap-4">

          {/* Anamnesis / examen */}
          {(c.observaciones || c.examen.length > 0) && (
            <Section icon="clinical_notes" title="Anamnesis y examen">
              {c.observaciones && <p className="text-[12.5px] text-slate-600 leading-relaxed mb-2">{c.observaciones}</p>}
              {c.examen.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {c.examen.map((e: any) => (
                    <span key={e.clave} className="text-[11.5px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg"><b className="font-semibold text-slate-700">{e.clave}:</b> {e.valor}</span>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Diagnósticos (con tratamientos, plan, receta) */}
          {c.diagnosticos.length === 0 ? (
            <p className="text-[12.5px] text-slate-400 italic">Sin diagnóstico registrado en esta consulta.</p>
          ) : c.diagnosticos.map((d: any) => (
            <div key={d.id} className="flex flex-col gap-4">

              {/* Diagnóstico */}
              <Section icon="biotech" title="Diagnóstico">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${d.es_definitivo ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{d.es_definitivo ? "Definitivo" : "Presuntivo"}</span>
                  {d.es_tratado && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">Se trata en clínica</span>}
                </div>
                <p className="text-[13px] font-medium text-slate-700">{d.texto}</p>
                {d.cie10 && (
                  <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 bg-slate-100 rounded-lg">
                    <span className="text-[11px] font-bold text-slate-500">{d.cie10.codigo}</span>
                    <span className="text-[11.5px] text-slate-600">{d.cie10.descripcion}</span>
                  </div>
                )}
              </Section>

              {/* Tratamientos */}
              {d.tratamientos.length > 0 && (
                <Section icon="medical_services" title="Tratamientos">
                  <div className="flex flex-col gap-1.5">
                    {d.tratamientos.map((t: any) => (
                      <div key={t.id} className="flex justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-[12.5px] text-slate-700">{t.nombre}{t.notas ? <span className="text-slate-400"> · {t.notas}</span> : null}</span>
                        <span className="text-[12.5px] font-medium text-slate-700 shrink-0">{money(t.precio, t.moneda)}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Plan de trabajo */}
              {d.plan.length > 0 && (
                <Section icon="checklist" title="Plan de trabajo">
                  <div className="flex flex-col gap-2">
                    {d.plan.map((p: any) => {
                      const cfg = PLAN_CFG[p.estado] ?? PLAN_CFG.hacer;
                      return (
                        <div key={p.id} className="flex items-start justify-between gap-3 p-2.5 bg-white rounded-lg border border-slate-100">
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold text-slate-700">{p.etapa}</p>
                            {p.descripcion && <p className="text-[11.5px] text-slate-500">{p.descripcion}</p>}
                            {p.tiempo && <p className="text-[11px] text-slate-400">⏱ {p.tiempo}</p>}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Recetas */}
              {d.recetas.length > 0 && (
                <Section icon="medication" title="Receta">
                  {d.recetas.map((r: any) => (
                    <div key={r.id} className="flex flex-col gap-2">
                      <span className={`self-start px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${r.estado === "activa" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{r.estado}</span>
                      {r.medicamentos.map((m: any, i: number) => (
                        <div key={i} className="text-[12.5px]">
                          <p className="font-semibold text-slate-700">{m.nombre} {m.dosis && <span className="font-normal text-slate-500">{m.dosis}</span>}</p>
                          {(m.frecuencia || m.indicaciones) && <p className="text-slate-500 text-[11.5px]">{[m.frecuencia, m.indicaciones].filter(Boolean).join(" · ")}</p>}
                        </div>
                      ))}
                    </div>
                  ))}
                </Section>
              )}
            </div>
          ))}

          {/* Presupuesto */}
          {c.presupuestos.length > 0 && c.presupuestos.map((p: any) => (
            <Section key={p.id} icon="receipt_long" title="Presupuesto">
              <div className="flex flex-col gap-1">
                {p.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
                    <span className="text-[12.5px] text-slate-600">{it.nombre} ×{it.cantidad}</span>
                    <span className="text-[12.5px] font-medium text-slate-700">{money(it.subtotal)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2"><span className="text-[13px] font-semibold text-slate-800">Total</span><span className="text-[13px] font-bold text-slate-900">{money(p.neto)}</span></div>
                <div className="flex justify-between"><span className="text-[12px] text-slate-500">Saldo</span><span className="text-[12px] font-medium text-amber-600">{money(p.saldo)}</span></div>
                <span className={`self-start mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${p.estado === "aprobado" ? "bg-emerald-100 text-emerald-700" : p.estado === "cancelado" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"}`}>{p.estado}</span>
              </div>
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon name={icon} size={16} className="text-cyan-600" />
        <p className="text-[13px] font-semibold text-slate-800">{title}</p>
      </div>
      {children}
    </div>
  );
}
