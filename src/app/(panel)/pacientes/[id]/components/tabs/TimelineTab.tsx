"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { staggerContainer, staggerItem, fadeIn, EASE } from "@/lib/animations";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { crearHistoriaClinicaAction, cambiarEstadoNotaAction } from "../../casos.actions";
import { getConsultaDetalleTimelineAction } from "../../consulta.actions";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtFull = (d: string) => {
  try { return new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
};
const fmtCorta = (d: string) => {
  try { return new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return d; }
};
const money = (n: number, m = "PEN") => `${m === "PEN" ? "S/" : m} ${Number(n).toFixed(2)}`;

const PLAN_CFG: Record<string, { bg: string; text: string; label: string }> = {
  hacer: { bg: "bg-slate-100 dark:bg-slate-700", text: "text-slate-600 dark:text-slate-300", label: "Por hacer" },
  haciendo: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "Haciendo" },
  hecho: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: "Hecho" },
};

type TabNav = "info" | "timeline" | "dental" | "diagnosticos" | "archivos" | "recetas" | "presupuestos";

// ─── Tab principal ────────────────────────────────────────────────────────────

export function TimelineTab({
  historial,
  datosCasos,
  pacienteId,
  onStartConsulta,
  onNavigateTab,
}: {
  historial: any[];
  datosCasos?: any;
  pacienteId: string;
  onStartConsulta?: () => void;
  onNavigateTab?: (tab: TabNav) => void;
}) {
  const casos = datosCasos?.casos || [];
  const hc = datosCasos?.historia_clinica;
  
  const [savingHC, setSavingHC] = useState(false);

  // Seleccionar la consulta. Usamos el historial plano solo para tener una base rápida si es necesario.
  const [selectedId, setSelectedId] = useState<string | null>(historial?.[0]?.id ?? null);
  
  // Estado para los detalles ricos que vienen del servidor
  const [detalleActivo, setDetalleActivo] = useState<any>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    let isActive = true;
    
    async function cargar() {
      setLoadingDetalle(true);
      const res = await getConsultaDetalleTimelineAction(selectedId as string);
      if (isActive && res) {
        setDetalleActivo(res);
      }
      if (isActive) {
        setLoadingDetalle(false);
      }
    }
    
    cargar();
    
    return () => { isActive = false; };
  }, [selectedId]);

  async function handleCrearHC() {
    setSavingHC(true);
    await crearHistoriaClinicaAction(String(pacienteId));
    setSavingHC(false);
  }

  async function handleCambiarEstado(notaId: string, e: React.ChangeEvent<HTMLSelectElement>) {
    await cambiarEstadoNotaAction(String(notaId), e.target.value, String(pacienteId));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera Historia Clínica */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Icon name="folder_shared" size={18} className="text-cyan-600 dark:text-cyan-400" />
            Historia Clínica Universal
          </h3>
          {hc ? (
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
              Código: <strong className="text-slate-700 dark:text-slate-300">{hc.codigo_historia}</strong> · Creada: {fmtFull(hc.fecha_creacion)}
            </p>
          ) : (
            <p className="text-[13px] text-amber-600 dark:text-amber-500 mt-1 flex items-center gap-1">
              <Icon name="warning" size={14} /> El paciente aún no tiene Historia Clínica generada.
            </p>
          )}
        </div>
        {!hc && (
          <button
            onClick={handleCrearHC}
            disabled={savingHC}
            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 disabled:opacity-50 rounded-xl text-[13px] font-bold transition-colors"
          >
            {savingHC ? "Creando..." : "Crear Historia Clínica"}
          </button>
        )}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-200">Casos Clínicos (Notas)</h3>
        {hc && onStartConsulta && (
          <button
            onClick={onStartConsulta}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[13px] font-semibold transition-colors shadow-sm"
          >
            <Icon name="add" size={16} /> Nuevo Caso / Consulta
          </button>
        )}
      </div>

      {casos.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 py-16 px-6 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center">
            <Icon name="history_edu" size={32} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-[15px] font-bold text-slate-700 dark:text-slate-300">Sin Casos Clínicos</p>
          <p className="text-[12.5px] text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
            Inicia un nuevo caso clínico para agrupar las consultas de este paciente.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 items-start">
          {/* Columna Izquierda: Casos */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {casos.map((caso: any) => (
              <div key={caso.id} className="bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                      {caso.motivo_consulta || "Caso sin motivo principal"}
                    </h4>
                    <p className="text-[12px] text-slate-500">Iniciado el: {fmtFull(caso.created_at)}</p>
                  </div>
                  <select 
                    className="text-[12px] font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1 outline-none"
                    defaultValue={caso.estado || "En Consulta"}
                    onChange={(e) => handleCambiarEstado(caso.id, e)}
                  >
                    <option value="En Consulta">En Consulta</option>
                    <option value="Diagnosticado">Diagnosticado</option>
                    <option value="En tratamiento">En tratamiento</option>
                    <option value="De Alta">De Alta</option>
                  </select>
                </div>

                <div className="pl-2">
                  {caso.consultas.length === 0 ? (
                    <p className="text-[12px] text-slate-400 italic">Sin consultas en este caso.</p>
                  ) : (
                    <motion.div variants={staggerContainer(0.06)} initial="hidden" animate="visible" className="flex flex-col">
                      {caso.consultas.map((c: any, i: number) => {
                        // Buscar la consulta rica en 'historial' para pasarla a TimelineNode
                        const cRica = historial?.find(x => x.id === c.id) || c;
                        return (
                          <TimelineNode
                            key={c.id}
                            consulta={cRica}
                            isLast={i === caso.consultas.length - 1}
                            active={c.id === selectedId}
                            onSelect={() => {
                              setSelectedId(c.id);
                              if (window.innerWidth < 1024) {
                                setIsMobileModalOpen(true);
                              }
                            }}
                            onNavigateTab={onNavigateTab}
                          />
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Columna derecha — panel de detalle fijo (solo desktop) */}
          <div className="hidden lg:block w-90 shrink-0 sticky top-17">
            {selectedId && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedId}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden overflow-y-auto no-scrollbar relative min-h-75"
                  style={{ maxHeight: "calc(100vh - 100px)" }}
                >
                  {loadingDetalle && (
                    <div className="absolute inset-0 z-10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {detalleActivo ? (
                    <ConsultaDetail consulta={detalleActivo} onNavigateTab={onNavigateTab} />
                  ) : (
                    <div className="p-8 text-center text-slate-400">Selecciona una consulta</div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      )}

      {/* Modal para Mobile */}
      <AnimatePresence>
        {isMobileModalOpen && selectedId && (
          <ResponsiveSheet onClose={() => setIsMobileModalOpen(false)}>
            <div className="relative min-h-75 overflow-y-auto no-scrollbar bg-white dark:bg-slate-800">
              {loadingDetalle && (
                <div className="absolute inset-0 z-10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {detalleActivo ? (
                <ConsultaDetail consulta={detalleActivo} onNavigateTab={(tab) => {
                  setIsMobileModalOpen(false);
                  if (onNavigateTab) onNavigateTab(tab);
                }} />
              ) : (
                <div className="p-8 text-center text-slate-400">Cargando detalles...</div>
              )}
            </div>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Nodo de lista (card compacta, clickable) ─────────────────────────────────

function TimelineNode({
  consulta: c, isLast, active, onSelect, onNavigateTab,
}: {
  consulta: any; isLast: boolean; active: boolean; onSelect: () => void; onNavigateTab?: (tab: TabNav) => void;
}) {
  const { getVars } = useTipoConsultaVars();
  const vars = getVars(c.tipo_consulta_id); // Se usa tipo_consulta_id para obtener los colores
  const diagCount = c.diagnosticos?.length || 0;
  const presuCount = c.presupuestos?.length || 0;
  const archivosCount = c.archivos?.length || 0;

  function handleClick() {
    onSelect();
  }

  return (
    <motion.div variants={staggerItem} className="flex gap-3">
      {/* Eje: línea + nodo */}
      <div className="relative w-5 shrink-0 flex flex-col items-center">
        <span
          className="w-3.5 h-3.5 rounded-full mt-5 shrink-0 z-10 ring-4 ring-slate-50 dark:ring-slate-900"
          style={{ background: vars.solid }}
        />
        {!isLast && <span className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />}
      </div>

      {/* Tarjeta */}
      <div className="flex-1 min-w-0 pb-4">
        <div className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden transition-colors ${active ? "border-cyan-300 dark:border-cyan-700 ring-1 ring-cyan-100 dark:ring-cyan-900/40" : "border-slate-200 dark:border-slate-700"}`}>
          <button
            onClick={handleClick}
            className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span
                  className="px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide"
                  style={{ background: vars.bg, color: vars.text }}
                >
                  {vars.label}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">{fmtFull(c.fecha || c.fecha_consulta)}</span>
              </div>
              <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100 leading-snug truncate">
                {c.motivo || "Consulta sin motivo"}
              </p>
              {c.doctor && <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{c.doctor}</p>}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              {diagCount > 0 && <CountBadge icon="assignment" count={diagCount} />}
              {archivosCount > 0 && <CountBadge icon="photo_library" count={archivosCount} />}
              {presuCount > 0 && <CountBadge icon="payments" count={presuCount} />}
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detalle de consulta (compartido entre panel fijo y acordeón mobile) ──────

function ConsultaDetail({ consulta: c, onNavigateTab }: { consulta: any; onNavigateTab?: (tab: TabNav) => void }) {
  const { getVars } = useTipoConsultaVars();
  const vars = getVars(c.motivo_id);

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="pb-3 border-b border-slate-100 dark:border-slate-700">
        <span
          className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide mb-1.5"
          style={{ background: vars.bg, color: vars.text }}
        >
          {vars.label}
        </span>
        <p className="text-[14.5px] font-bold text-slate-900 dark:text-slate-100 leading-snug">{c.motivo || "Consulta sin motivo"}</p>
        <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5">{fmtFull(c.fecha)}{c.doctor ? ` · ${c.doctor}` : ""}</p>
      </div>

      {(c.observaciones || (c.examen?.length ?? 0) > 0) && (
        <Section icon="notes" title="Observaciones">
          {c.observaciones && (
            <p className="text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2">{c.observaciones}</p>
          )}
          {(c.examen?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {c.examen.map((e: any) => (
                <span key={e.clave} className="text-[11.5px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg">
                  <b className="font-semibold text-slate-700 dark:text-slate-200">{e.clave}:</b> {e.valor}
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {(!c.diagnosticos || c.diagnosticos.length === 0) ? (
        <p className="text-[12.5px] text-slate-400 dark:text-slate-500 italic">Sin diagnóstico registrado en esta consulta.</p>
      ) : c.diagnosticos.map((d: any) => (
        <div key={d.id} className="flex flex-col gap-3">
          <Section icon="biotech" title="Diagnóstico">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${d.es_definitivo ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
                {d.es_definitivo ? "Definitivo" : "Presuntivo"}
              </span>
              {d.es_tratado && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                  Se trata en clínica
                </span>
              )}
            </div>
            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
              {d.texto}
              {d.fecha_deteccion && <span className="text-slate-400 dark:text-slate-500 font-normal ml-2 text-[11px] whitespace-nowrap">{fmtCorta(d.fecha_deteccion)}</span>}
            </p>
            {d.cie10 && (
              <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{d.cie10.codigo}</span>
                <span className="text-[11.5px] text-slate-600 dark:text-slate-300">{d.cie10.descripcion}</span>
              </div>
            )}
          </Section>

          {d.tratamientos?.length > 0 && (
            <Section icon="medical_services" title="Tratamiento y Plan">
              <div className="flex flex-col gap-3">
                {d.tratamientos.map((t: any) => (
                  <div key={t.id} className="flex flex-col gap-2 pb-3 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                    <div className="flex justify-between gap-3 items-start">
                      <span className="text-[12.5px] text-slate-700 dark:text-slate-300 font-semibold leading-snug">
                        {t.nombre}
                        {t.descripcion && <span className="text-slate-500 font-normal ml-1">— {t.descripcion}</span>}
                        {t.fecha && <span className="text-slate-400 dark:text-slate-500 font-normal ml-2 text-[11px] whitespace-nowrap">{fmtCorta(t.fecha)}</span>}
                      </span>
                      {t.precio != null && (
                        <span className="text-[12.5px] font-medium text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">{money(t.precio, t.moneda)}</span>
                      )}
                    </div>
                    {t.plan?.length > 0 && (
                      <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-slate-100 dark:border-slate-700 mt-0.5">
                        {t.plan.map((p: any) => {
                          const cfg = PLAN_CFG[p.estado] ?? PLAN_CFG.hacer;
                          return (
                            <div key={p.id} className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[11.5px] font-medium text-slate-600 dark:text-slate-400">{p.etapa}</p>
                                {(p.tiempo || p.descripcion) && (
                                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                                    {p.tiempo}{p.tiempo && p.descripcion ? " · " : ""}{p.descripcion}
                                  </p>
                                )}
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide shrink-0 ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {d.recetas?.length > 0 && (() => {
            const receta = d.recetas[0];
            const meds = receta.medicamentos || [];
            const preview = meds.slice(0, 2);
            const resto = meds.length - preview.length;
            return (
              <Section
                icon="medication"
                title="Receta"
                action={onNavigateTab && (
                  <button onClick={() => onNavigateTab("recetas")} className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300">
                    Ver completa
                  </button>
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${receta.estado === "activa" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                    {receta.estado}
                  </span>
                  {receta.fecha_emision && <span className="text-slate-400 dark:text-slate-500 font-normal text-[11px]">{fmtCorta(receta.fecha_emision)}</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  {preview.map((m: any, i: number) => (
                    <div key={i} className="text-[12.5px]">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {m.nombre} {m.dosis && <span className="font-normal text-slate-500 dark:text-slate-400">{m.dosis}</span>}
                      </p>
                    </div>
                  ))}
                  {resto > 0 && <p className="text-[11px] text-slate-400 dark:text-slate-500">+{resto} medicamento{resto !== 1 ? "s" : ""} más</p>}
                </div>
              </Section>
            );
          })()}
        </div>
      ))}

      {c.odontogramas && c.odontogramas.length > 0 && (
        <Section
          icon="tooth"
          title="Odontograma"
          action={onNavigateTab && (
            <button onClick={() => onNavigateTab("dental")} className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300">
              Ver completo
            </button>
          )}
        >
          {c.odontogramas.map((odo: any) => {
            const piezas = odo.odontograma_diente?.length || 0;
            return (
              <p key={odo.id} className="text-[12.5px] text-slate-700 dark:text-slate-300 mb-1 last:mb-0">
                <span className="font-semibold">{piezas}</span> pieza{piezas !== 1 ? "s" : ""} marcada{piezas !== 1 ? "s" : ""}
                {odo.tipo_tratamiento ? <span className="text-slate-400 dark:text-slate-500"> · {odo.tipo_tratamiento}</span> : null}
                {odo.created_at && <span className="text-slate-400 dark:text-slate-500 font-normal ml-2 text-[11px] whitespace-nowrap">{fmtCorta(odo.created_at)}</span>}
              </p>
            );
          })}
        </Section>
      )}

      {c.recomendaciones && c.recomendaciones.length > 0 && (
        <Section icon="heart" title="Recomendaciones">
          <ul className="list-disc pl-4 text-[12.5px] text-slate-700 dark:text-slate-300 flex flex-col gap-1">
            {c.recomendaciones.map((r: any) => (
              <li key={r.id}>{r.contenido}</li>
            ))}
          </ul>
        </Section>
      )}

      {c.archivos?.length > 0 && (
        <Section
          icon="photo_library"
          title="Archivos"
          action={onNavigateTab && (
            <button onClick={() => onNavigateTab("archivos")} className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300">
              Ver galería
            </button>
          )}
        >
          <div className="grid grid-cols-4 gap-1.5">
            {c.archivos.slice(0, 4).map((a: any, i: number) => {
              const isImg = a.tipo_archivo === "image" || /\.(jpg|jpeg|png|webp|gif)$/i.test(a.nombre_archivo || "");
              const extra = i === 3 ? c.archivos.length - 4 : 0;
              return (
                <div key={a.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                  {isImg && a.displayUrl ? (
                    <img src={a.displayUrl} alt={a.nombre_archivo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon name="description" size={18} className="text-red-400 dark:text-red-500" />
                    </div>
                  )}
                  {extra > 0 && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                      <span className="text-white text-[12px] font-bold">+{extra}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {c.presupuestos?.length > 0 && c.presupuestos.map((p: any) => (
        <Section key={p.id} icon="description" title="Presupuesto">
          <div className="flex flex-col gap-1">
            {p.items.map((it: any, i: number) => (
              <div key={i} className="flex justify-between gap-3 py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span className="text-[12.5px] text-slate-600 dark:text-slate-300">{it.nombre} ×{it.cantidad}</span>
                <span className="text-[12.5px] font-medium text-slate-700 dark:text-slate-300">{money(it.subtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2">
              <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Total</span>
              <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{money(p.neto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[12px] text-slate-500 dark:text-slate-400">Saldo</span>
              <span className="text-[12px] font-medium text-amber-600 dark:text-amber-400">{money(p.saldo)}</span>
            </div>
            <span className={`self-start mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${p.estado === "aprobado" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : p.estado === "cancelado" ? "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
              {p.estado}
            </span>
          </div>
        </Section>
      ))}
    </div>
  );
}

// ─── Componentes internos ─────────────────────────────────────────────────────

function CountBadge({ icon, count }: { icon: string; count: number }) {
  return (
    <span className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10.5px] font-bold">
      <Icon name={icon} size={12} />{count}
    </span>
  );
}

function Section({ icon, title, action, children }: { icon: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3.5">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Icon name={icon} size={16} className="text-cyan-600 dark:text-cyan-400" />
          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{title}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
