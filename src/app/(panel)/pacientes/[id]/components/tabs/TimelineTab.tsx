"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { staggerContainer, staggerItem, fadeIn, EASE } from "@/lib/animations";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { crearHistoriaClinicaAction, cambiarEstadoNotaAction } from "../../casos.actions";
import { getConsultaDetalleTimelineAction } from "../../consulta.actions";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { EditarConsultaModal } from "../EditarConsultaModal";

const ESTADO_CASO_OPTIONS = [
  { value: "En Consulta", label: "En Consulta" },
  { value: "Diagnosticado", label: "Diagnosticado" },
  { value: "En tratamiento", label: "En tratamiento" },
  { value: "De Alta", label: "De Alta" },
];

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
 hacer: { bg: "bg-slate-100", text: "text-slate-600", label: "Por hacer"},
 haciendo: { bg: "bg-amber-100", text: "text-amber-700", label: "Haciendo"},
 hecho: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Hecho"},
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
  const [estadoOverrides, setEstadoOverrides] = useState<Record<string, string>>({});
  const toast = useToast();

  // Acordeón de casos clínicos — el caso activo (estado distinto de "De
  // Alta") empieza abierto; los dados de alta empiezan cerrados. Solo se
  // guarda acá lo que el usuario tocó a mano (colapsar/expandir); mientras
  // un caso no esté en este mapa, su estado por defecto se deriva en cada
  // render a partir de `caso.estado` (ver `isCasoOpen`) — así un caso nuevo
  // que aparezca tras recargar también nace con el criterio correcto, sin
  // necesitar un efecto aparte.
  const [casoOpenOverrides, setCasoOpenOverrides] = useState<Record<string, boolean>>({});
  function isCasoOpen(caso: any): boolean {
    const override = casoOpenOverrides[caso.id];
    if (override !== undefined) return override;
    const estado = estadoOverrides[caso.id] ?? caso.estado ?? "En Consulta";
    return estado !== "De Alta";
  }
  function toggleCaso(caso: any) {
    setCasoOpenOverrides((prev) => ({ ...prev, [caso.id]: !isCasoOpen(caso) }));
  }

  // Seleccionar la consulta. Usamos el historial plano solo para tener una base rápida si es necesario.
  const [selectedId, setSelectedId] = useState<string | null>(historial?.[0]?.id ?? null);
  
  // Estado para los detalles ricos que vienen del servidor
  const [detalleActivo, setDetalleActivo] = useState<any>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isEditingConsulta, setIsEditingConsulta] = useState(false);

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

  async function handleCambiarEstado(notaId: string, nuevoEstado: string) {
    setEstadoOverrides((prev) => ({ ...prev, [notaId]: nuevoEstado }));
    const res = await cambiarEstadoNotaAction(String(notaId), nuevoEstado, String(pacienteId));
    if (res?.error) toast.error(res.error);
    else toast.success("Estado del caso actualizado correctamente");
  }

  const accionBoton = !hc ? (
    <button
      onClick={handleCrearHC}
      disabled={savingHC}
      className="shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 disabled:opacity-50 rounded-xl text-[12px] sm:text-[13px] font-bold transition-colors"
    >
      {savingHC ? "Creando..." : "Crear Historia Clínica"}
    </button>
  ) : onStartConsulta ? (
    <button
      onClick={onStartConsulta}
      title="Nuevo Caso / Consulta"
      className="shrink-0 flex items-center gap-1.5 px-3 lg:px-4 py-2 sm:py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] sm:text-[13px] font-semibold transition-colors shadow-sm"
    >
      <Icon name="add" size={16} />
      <span className="hidden lg:inline">Nuevo Caso / Consulta</span>
    </button>
  ) : null;

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0">
      {/* Cabecera fija — Casos Clínicos, pegada al nav de tabs sin franja que
          la separe, sin ser un contenedor aparte. El código y fecha de la
          historia clínica ahora viven en el header del paciente (debajo del
          DNI), no acá. */}
 <div className="shrink-0 sticky top-0 z-20 px-3 sm:px-4 md:px-6 bg-white border-b border-slate-100">
 <div className="flex items-center justify-between gap-3 py-3 sm:py-4">
          <div className="min-w-0">
            <h3 className="text-[15px] md:text-base font-bold text-slate-800">Casos Clínicos</h3>
            <p className="hidden sm:block text-[12px] text-slate-500 mt-0.5">Consultas del paciente agrupadas por caso, en orden cronológico.</p>
          </div>
          {accionBoton}
        </div>
      </div>

      <div className="flex flex-col lg:flex-1 lg:min-h-0">
      {casos.length === 0 ? (
 <div className="shrink-0 m-3 sm:m-4 md:m-6 bg-white rounded-2xl border border-slate-200 py-16 px-6 flex flex-col items-center text-center gap-3">
 <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
 <Icon name="history_edu" size={32} className="text-slate-300"/>
          </div>
 <p className="text-[15px] font-bold text-slate-700">Sin Casos Clínicos</p>
 <p className="text-[12.5px] text-slate-400 max-w-xs leading-relaxed">
            Inicia un nuevo caso clínico para agrupar las consultas de este paciente.
          </p>
        </div>
      ) : (
        <div className="bg-white flex gap-0 items-stretch lg:flex-1 lg:min-h-0">
          {/* Columna Izquierda: Casos — scroll propio oculto. Ya no es un
              conjunto de cards flotantes independientes: es una sola hoja con
              los casos separados por líneas grises (mismo patrón que
              Configuración), a todo el ancho y alto disponibles. */}
          <div className="flex-1 min-w-0 lg:max-w-200 flex flex-col divide-y divide-slate-200 lg:h-full lg:min-h-0 lg:overflow-y-auto no-scrollbar">
            {casos.map((caso: any) => {
              const open = isCasoOpen(caso);
              return (
              <div key={caso.id} className="p-3 sm:p-4 md:p-6">
                {/* Cabecera del acordeón — div clickeable (no <button>: el
                    Select de estado, adentro, ya es interactivo, y anidar un
                    <button> dentro de otro no es HTML válido). Su propio
                    clic no debe togglear el caso. */}
                <div
                  onClick={() => toggleCaso(caso)}
 className="w-full flex justify-between items-start gap-2 mb-2 cursor-pointer select-none"
                >
 <div className="flex items-start gap-2 min-w-0">
 <Icon name={open ? "expand_more" : "chevron_right"} size={18} className="text-slate-400 shrink-0 mt-0.5"/>
 <div className="min-w-0">
 <h4 className="text-[13px] font-bold text-slate-800 mb-0.5">
                        {caso.motivo_consulta || "Caso sin motivo principal"}
                      </h4>
                      <p className="text-[11px] text-slate-500">Iniciado el: {fmtFull(caso.created_at)}</p>
                    </div>
                  </div>
 <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Select
                      className="w-40"
                      value={estadoOverrides[caso.id] ?? caso.estado ?? "En Consulta"}
                      onChange={(v) => handleCambiarEstado(caso.id, v)}
                      options={ESTADO_CASO_OPTIONS}
                    />
                  </div>
                </div>

                {open && (
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
                )}
              </div>
              );
            })}
          </div>

          {/* Columna derecha — panel de detalle, tamaño fijo con su propio
              scroll independiente (no sticky: no se mueve con el scroll de la
              izquierda). Separada de la lista con un borde gris lineal, ya no
              es su propia card flotante. */}
          <div className="hidden lg:block w-90 shrink-0 border-l border-slate-200 lg:h-full lg:min-h-0 lg:overflow-y-auto no-scrollbar">
            {selectedId && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedId}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative min-h-75"
                >
                  {loadingDetalle && (
 <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {detalleActivo ? (
                    <ConsultaDetail consulta={detalleActivo} onNavigateTab={onNavigateTab} onEdit={() => setIsEditingConsulta(true)} />
                  ) : (
                    <div className="p-8 text-center text-slate-400">Selecciona una consulta</div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Modal para Mobile */}
      <AnimatePresence>
        {isMobileModalOpen && selectedId && (
          <ResponsiveSheet onClose={() => setIsMobileModalOpen(false)}>
 <div className="relative min-h-75 overflow-y-auto no-scrollbar bg-white">
              {loadingDetalle && (
 <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {detalleActivo ? (
                <ConsultaDetail consulta={detalleActivo} onNavigateTab={(tab) => {
                  setIsMobileModalOpen(false);
                  if (onNavigateTab) onNavigateTab(tab);
                }} onEdit={() => setIsEditingConsulta(true)} onClose={() => setIsMobileModalOpen(false)} />
              ) : (
                <div className="p-8 text-center text-slate-400">Cargando detalles...</div>
              )}
            </div>
          </ResponsiveSheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingConsulta && detalleActivo && (
          <EditarConsultaModal
            consulta={detalleActivo}
            pacienteId={pacienteId}
            onClose={() => setIsEditingConsulta(false)}
            onSaved={() => {
              setIsEditingConsulta(false);
              window.location.reload();
            }}
          />
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
  const vars = getVars(c.tipo_consulta_id || c.motivo_id);
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
 className="w-3 h-3 rounded-full mt-3.5 shrink-0 z-10 ring-4 ring-slate-50"
          style={{ background: vars.solid }}
        />
 {!isLast && <span className="w-0.5 flex-1 bg-slate-300"/>}
      </div>

      {/* Tarjeta */}
      <div className="flex-1 min-w-0 pb-2.5">
 <div className={`bg-white rounded-2xl border overflow-hidden transition-colors ${active ? "border-cyan-300 ring-1 ring-cyan-100" : "border-slate-200"}`}>
          <button
            onClick={handleClick}
 className="w-full flex items-start gap-3 p-2.5 text-left hover:bg-slate-50/60 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide"
                  style={{ background: vars.bg, color: vars.text }}
                >
                  {vars.label}
                </span>
 <span className="text-[11px] text-slate-400">{fmtFull(c.fecha || c.fecha_consulta)}</span>
              </div>
 <p className="text-[13px] font-bold text-slate-900 leading-snug truncate">
                {c.motivo || "Consulta sin motivo"}
              </p>
 {c.doctor && <p className="text-[11.5px] text-slate-500 mt-0.5 truncate">{c.doctor}</p>}
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

function ConsultaDetail({ consulta: c, onNavigateTab, onEdit, onClose }: { consulta: any; onNavigateTab?: (tab: TabNav) => void; onEdit?: () => void; onClose?: () => void }) {
  const { getVars } = useTipoConsultaVars();
  const vars = getVars(c.motivo_id);

  // Check if same day
  const hoy = new Date();
  const fechaConsulta = new Date(c.fecha);
  const isSameDay = hoy.getFullYear() === fechaConsulta.getFullYear() &&
                    hoy.getMonth() === fechaConsulta.getMonth() &&
                    hoy.getDate() === fechaConsulta.getDate();

  return (
    <div className="p-4 flex flex-col gap-3">
 <div className="pb-3 border-b border-slate-100">
        {/* Insignia y botones en la misma fila flex — así nunca se pisan
            entre sí sin importar el ancho de pantalla, a diferencia de
            posicionarlos con `absolute` y offsets en px calculados a mano
            entre dos componentes distintos (lo que se rompía en mobile/tablet). */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span
            className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide"
            style={{ background: vars.bg, color: vars.text }}
          >
            {vars.label}
          </span>

          {((isSameDay && onEdit) || onClose) && (
            <div className="flex items-center gap-2 shrink-0">
              {isSameDay && onEdit && (
                <button
                  onClick={onEdit}
 className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                  title="Editar consulta"
                >
                  <Icon name="edit" size={15} />
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
 className="w-8 h-8 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 shadow-sm transition-colors"
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
          )}
        </div>

 <p className="text-[14.5px] font-bold text-slate-900 leading-snug">{c.motivo ||"Consulta sin motivo"}</p>
 <p className="text-[11.5px] text-slate-400 mt-0.5">{fmtFull(c.fecha)}{c.doctor ?`· ${c.doctor}`:""}</p>
      </div>

      {(c.observaciones || (c.examen?.length ?? 0) > 0) && (
        <Section icon="notes" title="Observaciones">
          {c.observaciones && (
 <p className="text-[12.5px] text-slate-600 leading-relaxed mb-2">{c.observaciones}</p>
          )}
          {(c.examen?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {c.examen.map((e: any) => (
 <span key={e.clave} className="text-[11.5px] bg-white border border-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
 <b className="font-semibold text-slate-700">{e.clave}:</b> {e.valor}
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {(!c.diagnosticos || c.diagnosticos.length === 0) ? (
 <p className="text-[12.5px] text-slate-400 italic">Sin diagnóstico registrado en esta consulta.</p>
      ) : c.diagnosticos.map((d: any) => (
        <div key={d.id} className="flex flex-col gap-3">
          <Section icon="biotech" title="Diagnóstico">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${d.es_definitivo ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                {d.es_definitivo ? "Definitivo" : "Presuntivo"}
              </span>
              {d.es_tratado && (
 <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                  Se trata en clínica
                </span>
              )}
            </div>
 <p className="text-[13px] font-medium text-slate-700">
              {d.texto}
 {d.fecha_deteccion && <span className="text-slate-400 font-normal ml-2 text-[11px] whitespace-nowrap">{fmtCorta(d.fecha_deteccion)}</span>}
            </p>
            {d.cie10 && (
 <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 bg-white border border-slate-100 rounded-lg">
 <span className="text-[11px] font-bold text-slate-500">{d.cie10.codigo}</span>
 <span className="text-[11.5px] text-slate-600">{d.cie10.descripcion}</span>
              </div>
            )}
          </Section>

          {d.tratamientos?.length > 0 && (
            <Section icon="medical_services" title="Tratamiento y Plan">
              <div className="flex flex-col gap-3">
                {d.tratamientos.map((t: any) => (
 <div key={t.id} className="flex flex-col gap-2 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex justify-between gap-3 items-start">
 <span className="text-[12.5px] text-slate-700 font-semibold leading-snug">
                        {t.nombre}
                        {t.descripcion && <span className="text-slate-500 font-normal ml-1">— {t.descripcion}</span>}
 {t.fecha && <span className="text-slate-400 font-normal ml-2 text-[11px] whitespace-nowrap">{fmtCorta(t.fecha)}</span>}
                      </span>
                      {t.precio != null && (
 <span className="text-[12.5px] font-medium text-slate-700 shrink-0 mt-0.5">{money(t.precio, t.moneda)}</span>
                      )}
                    </div>
                    {t.plan?.length > 0 && (
 <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-slate-100 mt-0.5">
                        {t.plan.map((p: any) => {
                          const cfg = PLAN_CFG[p.estado] ?? PLAN_CFG.hacer;
                          return (
                            <div key={p.id} className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
 <p className="text-[11.5px] font-medium text-slate-600">{p.etapa}</p>
                                {(p.tiempo || p.descripcion) && (
 <p className="text-[10.5px] text-slate-400">
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
 <button onClick={() => onNavigateTab("recetas")} className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-800">
                    Ver completa
                  </button>
                )}
              >
                <div className="flex items-center gap-2 mb-2">
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${receta.estado === "activa" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {receta.estado}
                  </span>
 {receta.fecha_emision && <span className="text-slate-400 font-normal text-[11px]">{fmtCorta(receta.fecha_emision)}</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  {preview.map((m: any, i: number) => (
                    <div key={i} className="text-[12.5px]">
 <p className="font-semibold text-slate-700">
 {m.nombre} {m.dosis && <span className="font-normal text-slate-500">{m.dosis}</span>}
                      </p>
                    </div>
                  ))}
 {resto > 0 && <p className="text-[11px] text-slate-400">+{resto} medicamento{resto !== 1 ? "s" : ""} más</p>}
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
 <button onClick={() => onNavigateTab("dental")} className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-800">
              Ver completo
            </button>
          )}
        >
          {c.odontogramas.map((odo: any) => {
            const piezas = odo.odontograma_diente?.length || 0;
            return (
 <p key={odo.id} className="text-[12.5px] text-slate-700 mb-1 last:mb-0">
                <span className="font-semibold">{piezas}</span> pieza{piezas !== 1 ? "s" : ""} marcada{piezas !== 1 ? "s" : ""}
 {odo.tipo_tratamiento ? <span className="text-slate-400"> · {odo.tipo_tratamiento}</span> : null}
 {odo.created_at && <span className="text-slate-400 font-normal ml-2 text-[11px] whitespace-nowrap">{fmtCorta(odo.created_at)}</span>}
              </p>
            );
          })}
        </Section>
      )}

      {c.recomendaciones && c.recomendaciones.length > 0 && (
        <Section icon="heart" title="Recomendaciones">
 <ul className="list-disc pl-4 text-[12.5px] text-slate-700 flex flex-col gap-1">
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
 <button onClick={() => onNavigateTab("archivos")} className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-800">
              Ver galería
            </button>
          )}
        >
          <div className="grid grid-cols-4 gap-1.5">
            {c.archivos.slice(0, 4).map((a: any, i: number) => {
              const isImg = a.tipo_archivo === "image" || /\.(jpg|jpeg|png|webp|gif)$/i.test(a.nombre_archivo || "");
              const extra = i === 3 ? c.archivos.length - 4 : 0;
              return (
 <div key={a.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                  {isImg && a.displayUrl ? (
                    <img src={a.displayUrl} alt={a.nombre_archivo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
 <Icon name="description" size={18} className="text-red-400"/>
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
 <div key={i} className="flex justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
 <span className="text-[12.5px] text-slate-600">{it.nombre} ×{it.cantidad}</span>
 <span className="text-[12.5px] font-medium text-slate-700">{money(it.subtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2">
 <span className="text-[13px] font-semibold text-slate-800">Total</span>
 <span className="text-[13px] font-bold text-slate-900">{money(p.neto)}</span>
            </div>
            <div className="flex justify-between">
 <span className="text-[12px] text-slate-500">Saldo</span>
 <span className="text-[12px] font-medium text-amber-600">{money(p.saldo)}</span>
            </div>
 <span className={`self-start mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${p.estado === "aprobado" ? "bg-emerald-100 text-emerald-700": p.estado === "cancelado" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"}`}>
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
 <span className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-50 text-slate-500 text-[10.5px] font-bold">
      <Icon name={icon} size={12} />{count}
    </span>
  );
}

function Section({ icon, title, action, children }: { icon: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
 <div className="bg-white rounded-xl border border-slate-100 p-3.5">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
 <Icon name={icon} size={16} className="text-cyan-600"/>
 <p className="text-[13px] font-semibold text-slate-800">{title}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
