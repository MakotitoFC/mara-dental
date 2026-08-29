"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { SmartPopover } from "@/components/ui/SmartPopover";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import { ESTADO_PRESUPUESTO_CFG } from "@/lib/estadoConfig";
import { Badge } from "@/components/ui/Badge";
import {
  searchCatalogoAction,
  getCatalogoTratamientosAction,
  crearPresupuestoAction,
  editPresupuestoAction,
  updateEstadoPresupuestoAction,
  deletePresupuestoAction,
  getSedeInfoAction,
} from "../../consulta.actions";
import {
  esc, fmtGenerado, buildLetterheadHeader, buildLetterheadFooter, buildSignatureBlock, sectionLabel, wrapDocument, shortCode,
  printHtml, downloadHtmlAsPaginatedPdf, exportHtmlAsCanvas, type ClinicaInfo,
} from "@/lib/reportExport";

type Linea = { catalogo_id: number; nombre: string; cantidad: number; precio_unitario: number; moneda: string };

interface PresupuestoData {
  id: number;
  fecha_emision?: string;
  doctor_nombre?: string | null;
  doctor_especialidad?: string | null;
  doctor_num_colegiatura?: string | null;
  doctor_firma_url?: string | null;
  total_bruto: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  estado: string;
  fecha_aprobacion: string | null;
  notas: string | null;
  items: { id: number; nombre: string; descripcion?: string | null; moneda: string; cantidad: number; precio_unitario: number; subtotal: number }[];
  pagos: { id: number; monto: number; medio_pago_nombre: string; referencia: string | null; estado: string; fecha_pago: string }[];
}

function fmtFechaCorta(iso?: string) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return iso; }
}

const money = (n: number, m = "PEN") => `${m === "PEN" ? "S/" : m} ${n.toFixed(2)}`;

const ESTADO_LABEL: Record<string, string> = { pendiente: "Pendiente", aprobado: "Vigente", cancelado: "Cancelado" };

function buildPresupuestoHtml(opts: {
  clinica: ClinicaInfo | null;
  pacienteNombre?: string | null;
  pacienteDni?: string | null;
  presupuesto: PresupuestoData;
  totalNeto: number;
  moneda: string;
  pagosValidos: PresupuestoData["pagos"];
}): string {
  const { presupuesto, totalNeto, moneda, pagosValidos } = opts;
  const pagado = pagosValidos.reduce((acc, p) => acc + p.monto, 0);
  const saldo = totalNeto - pagado;
  const docCode = `Presupuesto #${shortCode(presupuesto.id)}`;

  const header = buildLetterheadHeader({
    clinica: opts.clinica,
    docLabel: "Presupuesto de Tratamiento",
    docCode,
    pacienteNombre: opts.pacienteNombre,
    generado: fmtGenerado(),
  });

  const infoCell = (label: string, value?: string | null) => value ? `
    <div>
      <div style="font-size:9px;font-weight:700;color:#95A5A6;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px;">${esc(label)}</div>
      <div style="font-size:12px;font-weight:700;color:#212E3D;">${esc(value)}</div>
    </div>
  ` : "";

  const infoBar = `
    <div style="margin:0 28px 20px;padding:14px 18px;background:#ecfeff;border-radius:10px;display:flex;flex-wrap:wrap;gap:18px;">
      ${infoCell("Paciente", opts.pacienteNombre)}
      ${infoCell("DNI", opts.pacienteDni)}
      ${infoCell("Médico tratante", presupuesto.doctor_nombre ? `Dr. ${presupuesto.doctor_nombre}` : null)}
      ${infoCell("Especialidad", presupuesto.doctor_especialidad)}
      ${infoCell("Estado", ESTADO_LABEL[presupuesto.estado] ?? presupuesto.estado)}
    </div>
  `;

  const itemsRows = presupuesto.items.map((it, i) => `
    <tr>
      <td style="padding:8px 4px;border-bottom:1px solid #F1F3F6;font-size:11px;font-weight:700;color:#0e7490;">${String(i + 1).padStart(2, "0")}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #F1F3F6;">
        <div style="font-size:12px;font-weight:600;color:#212E3D;">${esc(it.nombre)}</div>
        ${it.descripcion ? `<div style="font-size:10.5px;color:#95A5A6;">${esc(it.descripcion)}</div>` : ""}
      </td>
      <td style="padding:8px 4px;border-bottom:1px solid #F1F3F6;text-align:center;font-size:12px;color:#2C3E50;">${it.cantidad}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #F1F3F6;text-align:right;font-size:12px;color:#2C3E50;">${esc(money(it.precio_unitario, it.moneda))}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #F1F3F6;text-align:right;font-size:12px;font-weight:700;color:#212E3D;">${esc(money(it.subtotal, it.moneda))}</td>
    </tr>
  `).join("");

  const pagosRows = pagosValidos.length === 0
    ? `<p style="font-size:11.5px;color:#95A5A6;">Sin pagos registrados.</p>`
    : `<table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 4px;font-size:9px;font-weight:800;color:#95A5A6;text-transform:uppercase;border-bottom:1px solid #EDF0F4;">Fecha</th>
            <th style="text-align:left;padding:6px 4px;font-size:9px;font-weight:800;color:#95A5A6;text-transform:uppercase;border-bottom:1px solid #EDF0F4;">Método</th>
            <th style="text-align:left;padding:6px 4px;font-size:9px;font-weight:800;color:#95A5A6;text-transform:uppercase;border-bottom:1px solid #EDF0F4;">Referencia</th>
            <th style="text-align:right;padding:6px 4px;font-size:9px;font-weight:800;color:#95A5A6;text-transform:uppercase;border-bottom:1px solid #EDF0F4;">Monto</th>
          </tr>
        </thead>
        <tbody>
        ${pagosValidos.map((p) => `
          <tr>
            <td style="padding:7px 4px;border-bottom:1px solid #F1F3F6;font-size:11.5px;color:#2C3E50;">${esc(new Date(p.fecha_pago).toLocaleDateString("es-PE"))}</td>
            <td style="padding:7px 4px;border-bottom:1px solid #F1F3F6;font-size:11.5px;color:#2C3E50;">${esc(p.medio_pago_nombre)}</td>
            <td style="padding:7px 4px;border-bottom:1px solid #F1F3F6;font-size:11.5px;color:#95A5A6;">${esc(p.referencia || "—")}</td>
            <td style="padding:7px 4px;border-bottom:1px solid #F1F3F6;font-size:11.5px;font-weight:700;color:#059669;text-align:right;">${esc(money(p.monto, moneda))}</td>
          </tr>
        `).join("")}
        </tbody>
      </table>`;

  const summaryBox = (label: string, value: string, bg: string, fg: string) => `
    <div style="flex:1;background:${bg};border-radius:10px;padding:12px 14px;">
      <div style="font-size:9px;font-weight:800;color:${fg};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">${esc(label)}</div>
      <div style="font-size:16px;font-weight:800;color:${fg};">${esc(value)}</div>
    </div>
  `;

  const body = `
    ${infoBar}
    <div style="padding:0 28px;">
      ${sectionLabel("Detalle de tratamientos")}
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 4px;font-size:9.5px;font-weight:800;color:#95A5A6;text-transform:uppercase;border-bottom:2px solid #EDF0F4;">#</th>
            <th style="text-align:left;padding:6px 4px;font-size:9.5px;font-weight:800;color:#95A5A6;text-transform:uppercase;border-bottom:2px solid #EDF0F4;">Tratamiento</th>
            <th style="text-align:center;padding:6px 4px;font-size:9.5px;font-weight:800;color:#95A5A6;text-transform:uppercase;border-bottom:2px solid #EDF0F4;">Cant.</th>
            <th style="text-align:right;padding:6px 4px;font-size:9.5px;font-weight:800;color:#95A5A6;text-transform:uppercase;border-bottom:2px solid #EDF0F4;">P. Unit.</th>
            <th style="text-align:right;padding:6px 4px;font-size:9.5px;font-weight:800;color:#95A5A6;text-transform:uppercase;border-bottom:2px solid #EDF0F4;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:12px;">
        <div style="width:260px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#5D6D7E;margin-bottom:4px;padding:0 14px;"><span>Subtotal</span><span>${esc(money(presupuesto.total_bruto, moneda))}</span></div>
          ${presupuesto.descuento_monto > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#e11d48;margin-bottom:4px;padding:0 14px;"><span>Descuento (${presupuesto.descuento_porcentaje}%)</span><span>− ${esc(money(presupuesto.descuento_monto, moneda))}</span></div>` : ""}
          <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:#ffffff;background:#1A1A2E;border-radius:8px;padding:10px 14px;margin-top:6px;"><span>Total</span><span style="color:#22d3ee;">${esc(money(totalNeto, moneda))}</span></div>
        </div>
      </div>
    </div>

    <div style="padding:22px 28px 0;">
      ${sectionLabel("Registro de pagos")}
      ${pagosRows}
      <div style="display:flex;gap:12px;margin-top:14px;">
        ${summaryBox("Total pagado", money(pagado, moneda), "#ecfdf5", "#059669")}
        ${summaryBox("Saldo pendiente", money(saldo, moneda), saldo > 0 ? "#fffbeb" : "#ecfdf5", saldo > 0 ? "#d97706" : "#059669")}
        ${summaryBox("Total presupuesto", money(totalNeto, moneda), "#eff6ff", "#1d4ed8")}
      </div>
    </div>

    <div style="margin:22px 28px 0;padding:14px 16px;background:#F7F8FA;border-radius:10px;">
      <div style="font-size:10.5px;color:#5D6D7E;line-height:1.6;"><b style="color:#2C3E50;">Condiciones:</b> Este presupuesto tiene validez de 30 días desde la fecha de emisión. El paciente firma en señal de conformidad con el plan de tratamiento propuesto. Cualquier cambio en el plan de tratamiento puede modificar el total.</div>
    </div>

    <div style="padding:32px 28px 24px;display:flex;justify-content:space-between;align-items:flex-end;gap:20px;">
      <div style="text-align:left;">
        <div style="height:1px;width:170px;background:#D5D8DC;margin-bottom:6px;"></div>
        <div style="font-size:11px;font-weight:700;color:#212E3D;">Firma del Paciente</div>
        ${(opts.pacienteNombre || opts.pacienteDni) ? `<div style="font-size:9.5px;color:#95A5A6;">${esc([opts.pacienteNombre, opts.pacienteDni ? `DNI ${opts.pacienteDni}` : null].filter(Boolean).join(" · "))}</div>` : ""}
      </div>
      ${buildSignatureBlock({ nombre: presupuesto.doctor_nombre, especialidad: presupuesto.doctor_especialidad, numColegiatura: presupuesto.doctor_num_colegiatura, firmaUrl: presupuesto.doctor_firma_url })}
    </div>
  `;

  return wrapDocument(`${header}${body}${buildLetterheadFooter({ clinica: opts.clinica, pacienteNombre: opts.pacienteNombre, docCode })}`, 850);
}

export function PresupuestoPhase({ consultaId, pacienteId, paciente, presupuesto, mediosPago, onSaved, onCancel, onNavigateTab, fillHeight }: {
  consultaId: string; pacienteId: string; paciente: any; mediosPago: { id: number; nombre: string }[]; onSaved?: () => void;
  /** Solo aplica cuando presupuesto es null (creación) — permite volver a la selección anterior. */
  onCancel?: () => void;
  presupuesto: PresupuestoData | null;
  onNavigateTab?: (tab: string) => void;
  /** Cuando true, la tarjeta llena el alto disponible del padre (h-full) en vez
   * de un tope en vh — encabezado y total quedan fijos, solo los ítems scrollean. */
  fillHeight?: boolean;
}) {
  if (presupuesto) {
    return <PresupuestoExistente pacienteId={pacienteId} paciente={paciente} presupuesto={presupuesto} mediosPago={mediosPago} onSaved={onSaved} onNavigateTab={onNavigateTab} fillHeight={fillHeight} />;
  }
  return <PresupuestoBuilder consultaId={consultaId} pacienteId={pacienteId} onSaved={onSaved} onCancel={onCancel} />;
}

function PresupuestoSelectCombobox({
  onSelect,
}: {
  onSelect: (item: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [catalogoList, setCatalogoList] = useState<any[]>([]);
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getCatalogoTratamientosAction().then((data) => {
      setCatalogoList(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = catalogoList.filter((item) =>
    item.nombre.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="w-full">
      <SmartPopover
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        matchWidth
        renderTrigger={(ref) => (
          <div
            ref={ref}
            onClick={() => setOpen(true)}
 className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-[13px] flex items-center justify-between gap-2 cursor-pointer focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-100 shadow-sm"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
 <Icon name="search" size={16} className="text-slate-400 shrink-0"/>
              <input
                type="text"
                value={filterText}
                onChange={(e) => {
                  setFilterText(e.target.value);
                  if (!open) setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Buscar o seleccionar tratamiento del catálogo para agregar…"
 className="w-full bg-transparent text-slate-800 placeholder-slate-400 outline-none text-[16px] sm:text-[13px]"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0 text-slate-400">
              {loading && <div className="w-3.5 h-3.5 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />}
              <Icon name={open ? "expand_less" : "expand_more"} size={18} />
            </div>
          </div>
        )}
      >
        {/* Límite visual de 4 elementos a la vez con scroll */}
        <div
          onMouseDown={(e) => e.preventDefault()}
 className="bg-white border border-slate-200 shadow-xl rounded-xl max-h-[168px] overflow-y-auto no-scrollbar py-1"
        >
          {loading ? (
            <div className="px-3 py-4 text-center text-[12px] text-slate-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-cyan-600 rounded-full animate-spin" />
              Cargando catálogo...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-3 text-center text-[12px] text-slate-400">
              No se encontraron tratamientos
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                  setFilterText("");
                }}
 className="w-full text-left px-3 py-2 hover:bg-cyan-50 border-b border-slate-100 last:border-0 flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
 <span className="text-[13px] font-medium text-slate-800 truncate flex-1 min-w-0">
                  {item.nombre}
                </span>
 <span className="text-[12px] font-semibold text-slate-500 shrink-0">
                  {item.moneda || "S/"} {item.precio}
                </span>
              </button>
            ))
          )}
        </div>
      </SmartPopover>
    </div>
  );
}

// ─── Builder (no hay presupuesto aún o edición) ─────────────────────────────────────────

function PresupuestoBuilder({ consultaId, pacienteId, initialPresupuesto, onSaved, onCancel }: {
  consultaId: string; pacienteId: string; initialPresupuesto?: PresupuestoData; onSaved?: () => void; onCancel?: () => void;
}) {
  const [lineas, setLineas] = useState<Linea[]>(
    initialPresupuesto ? initialPresupuesto.items.map(it => ({
      catalogo_id: (it as any).tratamiento_id,
      nombre: it.nombre,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      moneda: it.moneda
    })) : []
  );
  const [descuento, setDescuento] = useState(initialPresupuesto ? initialPresupuesto.descuento_porcentaje : 0);
  const [notas, setNotas] = useState(initialPresupuesto?.notas || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addLinea(l: Linea) {
    if (lineas.some(x => x.catalogo_id === l.catalogo_id)) {
      setLineas(prev => prev.map(x => x.catalogo_id === l.catalogo_id ? { ...x, cantidad: x.cantidad + 1 } : x));
    } else {
      setLineas(prev => [...prev, l]);
    }
  }

  const totalBruto = lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0);
  const descMonto = totalBruto * descuento / 100;
  const totalNeto = totalBruto - descMonto;
  const moneda = lineas[0]?.moneda ?? "PEN";

  async function guardar() {
    if (lineas.length === 0) { setError("Agrega al menos un ítem"); return; }
    setSaving(true); setError("");

    let res;
    if (initialPresupuesto) {
      res = await editPresupuestoAction({
        presupuesto_id: String(initialPresupuesto.id),
        paciente_id: String(pacienteId),
        items: lineas.map(l => ({ catalogo_id: String(l.catalogo_id), cantidad: l.cantidad, precio_unitario: l.precio_unitario })),
        descuento_porcentaje: descuento,
        notas: notas || undefined,
      });
    } else {
      res = await crearPresupuestoAction({
        paciente_id: String(pacienteId),
        consulta_id: String(consultaId),
        items: lineas.map(l => ({ catalogo_id: String(l.catalogo_id), cantidad: l.cantidad, precio_unitario: l.precio_unitario })),
        descuento_porcentaje: descuento,
        notas: notas || undefined,
      });
    }

    setSaving(false);
    if (!res?.error) onSaved?.();
    else setError(res?.error || "Error al guardar el presupuesto");
  }

  return (
 <motion.div variants={fadeIn} initial="hidden" animate="visible" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col gap-5">
 <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
 <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
          <Icon name="receipt_long" size={18} />
        </div>
        <div>
 <h2 className="text-[14px] font-semibold text-slate-800">Presupuesto</h2>
 <p className="text-[11px] text-slate-400">Agrega ítems del catálogo para generar el presupuesto</p>
        </div>
      </div>

      {/* Buscador / Selector Combobox de catálogo */}
      <PresupuestoSelectCombobox
        onSelect={(r) =>
          addLinea({
            catalogo_id: r.id,
            nombre: r.nombre,
            cantidad: 1,
            precio_unitario: Number(r.precio),
            moneda: r.moneda ?? "PEN",
          })
        }
      />

      {/* Líneas */}
      {lineas.length === 0 ? (
 <div className="py-10 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
 <Icon name="receipt_long" size={28} className="text-slate-300 mb-2"/>
 <p className="text-[13px] text-slate-500">Sin ítems aún. Agrega desde el catálogo.</p>
        </div>
      ) : (
        <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-2">
          {lineas.map((l, i) => (
 <motion.div key={l.catalogo_id} variants={staggerItem} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
              <div className="flex-1 min-w-0">
 <p className="text-[13px] font-medium text-slate-800 truncate">{l.nombre}</p>
 <p className="text-[11px] text-slate-400">{money(l.precio_unitario, l.moneda)} c/u</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setLineas(prev => prev.map((x, idx) => idx === i ? { ...x, cantidad: Math.max(1, x.cantidad - 1) } : x))}
 className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"><Icon name="remove" size={14} /></button>
 <span className="w-8 text-center text-[13px] font-semibold text-slate-700">{l.cantidad}</span>
                <button onClick={() => setLineas(prev => prev.map((x, idx) => idx === i ? { ...x, cantidad: x.cantidad + 1 } : x))}
 className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"><Icon name="add" size={14} /></button>
              </div>
              <div className="w-24 text-right shrink-0">
                <input type="number" value={l.precio_unitario} min={0} step="0.01"
                  onChange={e => setLineas(prev => prev.map((x, idx) => idx === i ? { ...x, precio_unitario: Number(e.target.value) } : x))}
 className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[16px] sm:text-[13px] text-right outline-none focus:border-cyan-500 bg-white"/>
              </div>
 <span className="w-24 text-right text-[13px] font-semibold text-slate-800 shrink-0">{money(l.cantidad * l.precio_unitario, l.moneda)}</span>
              <button onClick={() => setLineas(prev => prev.filter((_, idx) => idx !== i))}
 className="w-8 h-8 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Icon name="delete" size={15} /></button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Totales */}
      {lineas.length > 0 && (
 <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between text-[13px]">
 <span className="text-slate-500">Subtotal</span>
 <span className="font-medium text-slate-700">{money(totalBruto, moneda)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
 <span className="text-slate-500 flex items-center gap-2">
              Descuento
              <span className="flex items-center gap-1">
                <input type="number" value={descuento} min={0} max={100}
                  onChange={e => setDescuento(Math.min(100, Math.max(0, Number(e.target.value))))}
 className="w-16 border border-slate-200 rounded-lg px-2 py-0.5 text-[16px] sm:text-[13px] text-right outline-none focus:border-cyan-500 bg-white"/>
 <span className="text-slate-400">%</span>
              </span>
            </span>
            <span className="font-medium text-red-500">− {money(descMonto, moneda)}</span>
          </div>
 <div className="flex items-center justify-between text-[15px] pt-2 border-t border-slate-100">
 <span className="font-semibold text-slate-800">Total</span>
 <span className="font-bold text-slate-900">{money(totalNeto, moneda)}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
 <label className="text-[12px] font-semibold text-slate-700">Notas (opcional)</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
          placeholder="Notas adicionales u observaciones..."
 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-500 bg-slate-50 resize-none"/>
      </div>

      {error && (
 <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-[12px] text-red-600">
          <Icon name="warning" size={14} className="shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end pt-2 gap-2">
        {onCancel && (
          <button onClick={onCancel} disabled={saving}
 className="px-6 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-[13px] font-semibold transition-colors">
            Cancelar
          </button>
        )}
        <button onClick={guardar} disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors">
          {saving && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
          {initialPresupuesto ? "Guardar Cambios" : "Generar Presupuesto"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Presupuesto existente (estados + pagos) ──────────────────────────────────

function PresupuestoExistente({ pacienteId, paciente, presupuesto, mediosPago, onSaved, onNavigateTab, fillHeight }: {
  pacienteId: string; paciente?: { nombre_completo?: string; dni?: string | null } | null;
  presupuesto: PresupuestoData; mediosPago: { id: number; nombre: string }[]; onSaved?: () => void;
  onNavigateTab?: (tab: string) => void;
  fillHeight?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [showPago, setShowPago] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState<"print" | "pdf" | "telegram" | null>(null);
  const [sede, setSede] = useState<ClinicaInfo | null>(null);

  useEffect(() => {
    getSedeInfoAction().then(setSede).catch(() => {});
  }, []);

  const moneda = presupuesto.items[0]?.moneda ?? "PEN";
  const totalNeto = presupuesto.total_bruto - presupuesto.descuento_monto;
  const pagosValidos = presupuesto.pagos.filter(p => p.estado !== "anulado");

  const cfg = ESTADO_PRESUPUESTO_CFG[presupuesto.estado] ?? ESTADO_PRESUPUESTO_CFG.pendiente;

  async function cambiarEstado(estado: string) {
    setBusy(true); setError("");
    const res = await updateEstadoPresupuestoAction({ presupuesto_id: String(presupuesto.id), estado, paciente_id: String(pacienteId) });
    setBusy(false);
    if (res?.error) { setError(res.error); return; }
    onSaved?.();
  }

  async function eliminar() {
    if (!confirm("¿Eliminar este presupuesto y todos sus pagos? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    await deletePresupuestoAction(String(presupuesto.id), String(pacienteId));
    setBusy(false);
    onSaved?.();
  }

  async function handleExportar(mode: "print" | "pdf" | "telegram") {
    setExportando(mode);
    try {
      const html = buildPresupuestoHtml({ clinica: sede, pacienteNombre: paciente?.nombre_completo, pacienteDni: paciente?.dni, presupuesto, totalNeto, moneda, pagosValidos });
      const pacienteSlug = (paciente?.nombre_completo || "paciente").replace(/\s+/g, "_");
      if (mode === "print") await printHtml(html, `Presupuesto · ${paciente?.nombre_completo || ""}`);
      else if (mode === "pdf") await downloadHtmlAsPaginatedPdf(html, `presupuesto_${pacienteSlug}_${shortCode(presupuesto.id)}.pdf`, 850);
      else if (mode === "telegram") {
        const canvas = await exportHtmlAsCanvas(html);
        canvas.toBlob((blob) => {
          if (!blob) {
            alert("No se pudo generar la imagen del presupuesto");
            return;
          }
          const file = new File([blob], `presupuesto_${pacienteSlug}.png`, { type: "image/png" });
          (window as any).__pendingTelegramFile = file;
          if (onNavigateTab) {
            onNavigateTab("chat");
          }
        }, "image/png");
      }
    } catch (err) {
      console.error("Error exportando presupuesto: ", err);
    } finally {
      if (mode !== "telegram") setExportando(null); // telegram is async with toBlob, but we'll clear it via unmount anyway, or just clear it immediately. Wait, toBlob is async but fast. Let's clear it immediately.
      else setTimeout(() => setExportando(null), 500); // clear UI state after a moment
    }
  }

  if (isEditing) {
    return (
      <PresupuestoBuilder 
        consultaId="0" 
        pacienteId={pacienteId} 
        initialPresupuesto={presupuesto} 
        onSaved={() => { setIsEditing(false); onSaved?.(); }} 
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className={`flex flex-col gap-4 ${fillHeight ? "h-full min-h-0" : ""}`}>
      {/* Card presupuesto */}
      {/* max-h-[480px] = 8 filas × 60px, mismo tope que el panel de Historial de al lado (PresupuestoTab). */}
 <div className={`bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 md:p-6 flex flex-col gap-4 min-h-0 ${fillHeight ? "h-full" : "max-h-[480px]"}`}>
 <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
            {presupuesto.fecha_emision && (
 <span className="text-[13px] font-semibold text-slate-700">{fmtFechaCorta(presupuesto.fecha_emision)}</span>
            )}
            <Badge status={cfg.status} className="text-[10px] font-bold uppercase tracking-wide">
              {cfg.label}
            </Badge>
            {presupuesto.doctor_nombre && (
 <span className="text-[11px] text-slate-400 flex items-center gap-1"><Icon name="person" size={11} /> Dr. {presupuesto.doctor_nombre}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {presupuesto.estado === "pendiente" && (
              <button onClick={() => setIsEditing(true)} title="Editar Presupuesto"
 className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
                <Icon name="edit" size={13} />
              </button>
            )}
            <button onClick={() => handleExportar("print")} disabled={exportando !== null} title="Imprimir"
 className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <Icon name="print" size={13} />
            </button>
            <button onClick={() => handleExportar("pdf")} disabled={exportando !== null} title="Descargar PDF"
 className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <Icon name="download" size={13} />
            </button>
            <button onClick={() => handleExportar("telegram")} disabled={exportando !== null} title="Enviar por Telegram"
 className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-[color:var(--telegram-blue)] hover:bg-[color:var(--telegram-blue)]/10 disabled:opacity-40 transition-colors">
              <Icon name="send" size={13} />
            </button>
          </div>
        </div>

        {/* Detalle de ítems — su propio scroll independiente; Total y acciones quedan fijos debajo.
            Tabla con encabezado solo desde md (tablet ancho/desktop); en mobile y tablet angosto,
            mismo patrón de tarjetas sin encabezado de tabla que usan las vistas de admin
            (Personal/Catálogo/Auditoría) — cada campo con su label arriba del valor. */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <div className="hidden md:block overflow-x-auto -mx-1">
            <table className="w-full text-left border-collapse min-w-[420px]">
              <thead>
 <tr className="border-b border-slate-100">
 <th className="sticky top-0 z-10 bg-white px-1 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tratamiento</th>
 <th className="sticky top-0 z-10 bg-white px-1 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">Cant.</th>
 <th className="sticky top-0 z-10 bg-white px-1 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-right">P. Unit.</th>
 <th className="sticky top-0 z-10 bg-white px-1 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {presupuesto.items.map(it => (
 <tr key={it.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-1 py-2.5 align-top">
 <p className="text-[13px] font-medium text-slate-800">{it.nombre}</p>
 {it.descripcion && <p className="text-[11px] text-slate-400 mt-0.5">{it.descripcion}</p>}
                    </td>
 <td className="px-1 py-2.5 align-top text-center text-[13px] text-slate-600">{it.cantidad}</td>
 <td className="px-1 py-2.5 align-top text-right text-[13px] text-slate-600 whitespace-nowrap">{money(it.precio_unitario, it.moneda)}</td>
 <td className="px-1 py-2.5 align-top text-right text-[13px] font-semibold text-slate-800 whitespace-nowrap">{money(it.subtotal, it.moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

 <div className="md:hidden divide-y divide-slate-100">
            {presupuesto.items.map(it => (
              <div key={it.id} className="py-3 flex flex-col gap-2">
                <div>
 <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Tratamiento</span>
 <p className="text-[13px] font-medium text-slate-800">{it.nombre}</p>
 {it.descripcion && <p className="text-[11px] text-slate-400 mt-0.5">{it.descripcion}</p>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
 <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Cant.</span>
 <span className="text-[13px] text-slate-600">{it.cantidad}</span>
                  </div>
                  <div>
 <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">P. Unit.</span>
 <span className="text-[13px] text-slate-600 whitespace-nowrap">{money(it.precio_unitario, it.moneda)}</span>
                  </div>
                  <div className="text-right">
 <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Subtotal</span>
 <span className="text-[13px] font-semibold text-slate-800 whitespace-nowrap">{money(it.subtotal, it.moneda)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total y acciones — fijos, no forman parte del scroll de arriba */}
 <div className="shrink-0 flex flex-col gap-1.5 border-t border-slate-100 pt-3">
 <div className="flex justify-between text-[13px]"><span className="text-slate-500">Subtotal</span><span className="text-slate-700">{money(presupuesto.total_bruto, moneda)}</span></div>
          {presupuesto.descuento_monto > 0 && (
 <div className="flex justify-between text-[13px]"><span className="text-slate-500">Descuento ({presupuesto.descuento_porcentaje}%)</span><span className="text-red-500">− {money(presupuesto.descuento_monto, moneda)}</span></div>
          )}
 <div className="flex justify-between text-[15px] pt-1"><span className="font-semibold text-slate-800">Total</span><span className="font-bold text-slate-900">{money(totalNeto, moneda)}</span></div>
        </div>

        {error && (
 <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-[12px] text-red-600">
            <Icon name="warning" size={14} className="shrink-0" /> {error}
          </div>
        )}

        {/* Acciones de estado — aprobar/volver a un extremo, cancelar/eliminar al otro.
            En mobile todos caben en una sola fila mostrando solo el ícono. */}
        <div className="shrink-0 flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2 pt-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {presupuesto.estado === "pendiente" && (
              <button onClick={() => cambiarEstado("aprobado")} disabled={busy} title="Aprobar presupuesto"
                className="flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-xl text-[12px] font-semibold transition-colors">
                <Icon name="check_circle" size={15} /> <span className="hidden sm:inline">Aprobar presupuesto</span>
              </button>
            )}
            {presupuesto.estado === "aprobado" && (
              <button onClick={() => cambiarEstado("pendiente")} disabled={busy} title="Volver a pendiente"
 className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[12px] font-medium transition-colors">
                <Icon name="undo" size={15} /> <span className="hidden sm:inline">Volver a pendiente</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {presupuesto.estado !== "cancelado" && (
              <button onClick={() => cambiarEstado("cancelado")} disabled={busy} title="Cancelar"
 className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-[12px] font-medium transition-colors">
                <Icon name="block" size={15} /> <span className="hidden sm:inline">Cancelar</span>
              </button>
            )}
            <button onClick={eliminar} disabled={busy} title="Eliminar presupuesto"
 className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 text-red-500 hover:bg-red-50 border border-red-100 disabled:opacity-40 rounded-xl text-[12px] font-medium transition-colors">
              <Icon name="delete" size={14} /> <span className="hidden sm:inline">Eliminar presupuesto</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

