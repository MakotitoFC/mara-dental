"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { VisorModal } from "@/app/(panel)/pacientes/consulta/[id]/components/VisorModal";
import type { TimelineEvent } from "../actions";

type TipoEvento = TimelineEvent["type"];

const TIPO_CFG: Record<TipoEvento, { label: string; docLabel: string; icon: string; bg: string; fg: string }> = {
  consulta:    { label: "Consulta",    docLabel: "Consulta médica",     icon: "stethoscope",  bg: "#E1F5EE", fg: "#0F6E56" },
  receta:      { label: "Receta",      docLabel: "Receta farmacéutica", icon: "medication",   bg: "#EEEDFE", fg: "#534AB7" },
  imagen:      { label: "Imagen",      docLabel: "Imagen clínica",      icon: "image",        bg: "#E6F1FB", fg: "#0C447C" },
  presupuesto: { label: "Presupuesto", docLabel: "Presupuesto",         icon: "receipt_long", bg: "#FAEEDA", fg: "#854F0B" },
  odontograma: { label: "Odontograma", docLabel: "Odontograma",         icon: "dentistry",    bg: "#E1F5EE", fg: "#0F6E56" },
};

const FILTROS: { key: TipoEvento | "todos"; label: string }[] = [
  { key: "todos",       label: "Todos" },
  { key: "consulta",    label: "Consultas" },
  { key: "receta",      label: "Recetas" },
  { key: "imagen",      label: "Imágenes" },
  { key: "presupuesto", label: "Presupuestos" },
];

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const dayKey   = (d: string) => { try { return new Date(d).toDateString(); } catch { return d; } };
const isToday  = (d: string) => { try { return new Date(d).toDateString() === new Date().toDateString(); } catch { return false; } };
const fmtDiaMes = (d: string) => { try { const x = new Date(d); return `${x.getDate()} de ${MESES[x.getMonth()]}`; } catch { return d; } };
const fmtYear   = (d: string) => { try { return String(new Date(d).getFullYear()); } catch { return ""; } };
const fmtHora   = (d: string) => { try { return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

function initials(name?: string) {
  if (!name) return "";
  const n = name.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/);
  return ((n[0]?.[0] || "") + (n[1]?.[0] || "")).toUpperCase();
}

export function TimelineView({ events, pacienteNombre }: { events: TimelineEvent[]; pacienteNombre: string }) {
  const [filtro, setFiltro] = useState<TipoEvento | "todos">("todos");
  const filtrados = useMemo(() => events.filter(e => filtro === "todos" || e.type === filtro), [events, filtro]);

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {FILTROS.map(f => {
          const active = filtro === f.key;
          return (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`text-[12.5px] px-3 py-1.5 rounded-full border transition-colors ${
                active ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}>
              {f.label}
            </button>
          );
        })}
      </div>

      {filtrados.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Icon name="history" size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-[13px]">Sin eventos clínicos registrados</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {filtrados.map((e, i) => {
            const prev = filtrados[i - 1];
            const showDate = !prev || dayKey(prev.fecha) !== dayKey(e.fecha);
            const last = i === filtrados.length - 1;
            const hoy = isToday(e.fecha);
            return (
              <div key={e.id} className="flex gap-2 sm:gap-4">
                {/* Fecha (una vez por día) */}
                <div className="w-[70px] sm:w-[96px] shrink-0 text-right pt-4">
                  {showDate && (
                    <>
                      <p className="text-[13px] sm:text-[15px] font-bold text-slate-800 leading-tight">{fmtDiaMes(e.fecha)}</p>
                      <p className={`text-[10.5px] font-semibold tracking-wide leading-tight mt-0.5 ${hoy ? "text-emerald-500" : "text-slate-400"}`}>
                        {hoy ? `HOY, ${fmtYear(e.fecha)}` : fmtYear(e.fecha)}
                      </p>
                    </>
                  )}
                </div>

                {/* Riel + nodo */}
                <div className="relative w-4 shrink-0 flex justify-center">
                  <div className="absolute w-[2px] bg-slate-200" style={{ top: showDate ? "26px" : 0, bottom: last ? "auto" : 0, height: last ? "0" : undefined }} />
                  <div className={`relative z-10 mt-[22px] w-3.5 h-3.5 rounded-full ${hoy ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-white border-2 border-slate-300"}`} />
                </div>

                {/* Tarjeta */}
                <div className="flex-1 min-w-0 pb-5">
                  <EventCard evento={e} pacienteNombre={pacienteNombre} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta de evento (acordeón) ─────────────────────────────────────────────

function EventCard({ evento, pacienteNombre }: { evento: TimelineEvent; pacienteNombre: string }) {
  const cfg = TIPO_CFG[evento.type];
  const m = evento.meta || {};
  const [open, setOpen] = useState(false);
  const [visor, setVisor] = useState(false);

  const metaLine =
    evento.type === "consulta"   ? (evento.doctor || evento.sub) :
    evento.type === "receta"     ? (evento.doctor ? `Recetado por ${evento.doctor}` : evento.sub) :
    evento.sub;
  const avatarTxt = initials(evento.doctor) || cfg.label.slice(0, 2).toUpperCase();

  const archivo = evento.type === "imagen" ? {
    id: m.archivoId, nombre_archivo: m.nombre_archivo, url: m.url,
    tipo_archivo: m.tipo, categoria: m.categoria, anotaciones: m.anotaciones || [], displayUrl: m.displayUrl,
  } : null;

  // Chip resumen (estado colapsado)
  const examenVals = Object.entries(m.examen || {}).filter(([k]) => k !== "tipo");
  const resumen = (() => {
    switch (evento.type) {
      case "consulta":    return { label: "Parámetro", value: examenVals.length > 0 ? `${examenVals[0][0]}: ${examenVals[0][1]}` : "Sin parámetros" };
      case "receta":      return { label: "Tratamiento", value: `${(m.medicamentos || []).length} medicamento(s) · ${m.estado}` };
      case "imagen":      return { label: "Categoría", value: m.categoria || "Archivo" };
      case "presupuesto": return { label: "Total", value: `S/ ${Number(m.neto ?? 0).toFixed(2)} · ${m.estado}` };
      case "odontograma": return { label: "Hallazgos", value: `${(m.hallazgos || []).length} pieza(s)` };
    }
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: cfg.bg, color: cfg.fg }}>
          <Icon name={cfg.icon} size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: cfg.fg }}>
            {cfg.docLabel} <span className="text-slate-300 font-medium">· {fmtHora(evento.fecha)}</span>
          </p>
          <p className="text-[15px] sm:text-[16px] font-bold text-slate-900 leading-snug mt-0.5 truncate">{evento.title}</p>
          <div className="flex items-center gap-2 mt-1.5 min-w-0">
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">{avatarTxt}</span>
            <span className="text-[12.5px] text-slate-500 truncate">{metaLine}</span>
          </div>
        </div>
      </div>

      {/* Barra resumen + toggle */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-slate-100">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{resumen?.label}</p>
          <span className="inline-block text-[12px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: cfg.bg, color: cfg.fg }}>{resumen?.value}</span>
        </div>
        <button onClick={() => setOpen(o => !o)} aria-label={open ? "Contraer" : "Expandir"}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors shrink-0">
          <Icon name={open ? "expand_less" : "expand_more"} size={20} />
        </button>
      </div>

      {/* Detalle expandible */}
      {open && (
        <div className="border-t border-slate-100 p-4 sm:p-5 bg-slate-50/50">
          {evento.type === "consulta" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailCard icon="monitor_heart" iconColor="#0F6E56" title="Motivo de consulta">
                  <p className="text-slate-600 leading-relaxed">{m.observaciones || evento.title || "Sin descripción."}</p>
                </DetailCard>
                <DetailCard icon="fact_check" iconColor="#0F6E56" title="Examen físico">
                  {examenVals.length === 0
                    ? <p className="text-slate-400 italic">Sin hallazgos registrados.</p>
                    : <ul className="flex flex-col gap-1.5">
                        {examenVals.map(([k, v]) => (
                          <li key={k} className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" /><span className="text-slate-600"><b className="font-semibold text-slate-700">{k}:</b> {String(v)}</span></li>
                        ))}
                      </ul>}
                </DetailCard>
              </div>
              <Link href={`/pacientes/consulta/${m.consultaId}`}
                className="mt-3 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[13px] font-semibold transition-colors">
                <Icon name="visibility" size={16} /> Ver consulta completa
              </Link>
            </>
          )}

          {evento.type === "receta" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailCard icon="medication" iconColor="#534AB7" title="Dosificación recetada">
                <ul className="flex flex-col gap-2">
                  {(m.medicamentos || []).map((med: any, i: number) => (
                    <li key={i}>
                      <p className="font-semibold text-slate-700">{med.medicamento_nombre} {med.dosis && <span className="font-normal text-slate-500">{med.dosis}</span>}</p>
                      {(med.frecuencia || med.indicaciones) && <p className="text-slate-500 text-[11.5px]">{[med.frecuencia, med.indicaciones].filter(Boolean).join(" · ")}</p>}
                    </li>
                  ))}
                </ul>
              </DetailCard>
              <DetailCard icon="verified" iconColor="#534AB7" title="Estado de la receta">
                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${m.estado === "activa" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{m.estado}</span>
                <p className="text-slate-400 text-[11.5px] mt-2">Emitida en MaraDental</p>
              </DetailCard>
            </div>
          )}

          {evento.type === "imagen" && (
            <div className="flex flex-col gap-3">
              <button onClick={() => m.isImg && setVisor(true)}
                className="h-52 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden relative group">
                {m.isImg && m.displayUrl
                  ? <img src={m.displayUrl} alt={m.nombre_archivo} className="w-full h-full object-cover" />
                  : <Icon name="description" size={40} className="text-slate-300" />}
                {m.isImg && <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center"><Icon name="zoom_in" size={26} className="text-white opacity-0 group-hover:opacity-100" /></div>}
              </button>
              {m.isImg && (
                <button onClick={() => setVisor(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[13px] font-semibold transition-colors">
                  <Icon name="edit" size={16} /> Abrir visor (pin · trazar)
                </button>
              )}
            </div>
          )}

          {evento.type === "presupuesto" && (
            <DetailCard icon="receipt_long" iconColor="#854F0B" title="Detalle del presupuesto">
              <div className="flex flex-col gap-1">
                {(m.items || []).map((it: any, i: number) => (
                  <div key={i} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600">{it.nombre} ×{it.cantidad}</span>
                    <span className="font-medium text-slate-700">S/ {Number(it.subtotal).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 text-[13px]"><span className="font-semibold text-slate-800">Total</span><span className="font-bold text-slate-900">S/ {Number(m.neto ?? 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Saldo</span><span className="font-medium text-amber-600">S/ {Number(m.saldo ?? 0).toFixed(2)}</span></div>
              </div>
            </DetailCard>
          )}

          {evento.type === "odontograma" && (
            <DetailCard icon="dentistry" iconColor="#0F6E56" title="Hallazgos por pieza">
              {(m.hallazgos || []).length === 0
                ? <p className="text-slate-400 italic">Sin hallazgos.</p>
                : <div className="flex flex-col gap-1.5">
                    {(m.hallazgos || []).map((h: any, i: number) => (
                      <div key={i} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                        <span className="text-slate-600">Pieza {h.diente}</span>
                        <span className="font-medium text-slate-700">{h.condicion}</span>
                      </div>
                    ))}
                  </div>}
            </DetailCard>
          )}
        </div>
      )}

      {visor && archivo && (
        <VisorModal archivo={archivo as any} todos={[archivo as any]} onClose={() => setVisor(false)} onNav={() => {}} />
      )}
    </div>
  );
}

function DetailCard({ icon, iconColor, title, children }: { icon: string; iconColor: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <Icon name={icon} size={16} style={{ color: iconColor }} />
        <p className="text-[13px] font-semibold text-slate-800">{title}</p>
      </div>
      <div className="text-[12.5px]">{children}</div>
    </div>
  );
}
