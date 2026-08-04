"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import {
  searchCatalogoAction,
  crearPresupuestoAction,
  editPresupuestoAction,
  updateEstadoPresupuestoAction,
  deletePresupuestoAction,
  registrarPagoAction,
  anularPagoAction,
  getSedeInfoAction,
} from "../../consulta.actions";
import {
  esc, fmtGenerado, buildLetterheadHeader, buildLetterheadFooter, wrapDocument,
  printHtml, downloadHtmlAsSinglePagePdf, exportHtmlAsCanvas, type ClinicaInfo,
} from "@/lib/reportExport";

type Linea = { catalogo_id: number; nombre: string; cantidad: number; precio_unitario: number; moneda: string };

interface PresupuestoData {
  id: number;
  fecha_emision?: string;
  doctor_nombre?: string | null;
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

function buildPresupuestoHtml(opts: {
  clinica: ClinicaInfo | null;
  pacienteNombre?: string | null;
  presupuesto: PresupuestoData;
  totalNeto: number;
  moneda: string;
  pagosValidos: PresupuestoData["pagos"];
}): string {
  const { presupuesto, totalNeto, moneda, pagosValidos } = opts;
  const pagado = pagosValidos.reduce((acc, p) => acc + p.monto, 0);
  const saldo = totalNeto - pagado;

  const header = buildLetterheadHeader({
    clinica: opts.clinica,
    titulo: `Presupuesto #${presupuesto.id}`,
    sub: opts.pacienteNombre || undefined,
    generado: fmtGenerado(),
  });

  const itemsRows = presupuesto.items.map((it) => `
    <tr>
      <td style="padding:8px 4px;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:12px;font-weight:600;color:#1e293b;">${esc(it.nombre)}</div>
        ${it.descripcion ? `<div style="font-size:10.5px;color:#94a3b8;">${esc(it.descripcion)}</div>` : ""}
      </td>
      <td style="padding:8px 4px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px;color:#334155;">${it.cantidad}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:12px;color:#334155;">${esc(money(it.precio_unitario, it.moneda))}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:12px;font-weight:700;color:#1e293b;">${esc(money(it.subtotal, it.moneda))}</td>
    </tr>
  `).join("");

  const pagosRows = pagosValidos.length === 0
    ? `<p style="font-size:11.5px;color:#94a3b8;">Sin pagos registrados.</p>`
    : `<table style="width:100%;border-collapse:collapse;">
        ${pagosValidos.map((p) => `
          <tr>
            <td style="padding:6px 4px;border-bottom:1px solid #f1f5f9;font-size:11.5px;color:#334155;">${esc(new Date(p.fecha_pago).toLocaleDateString("es-PE"))} · ${esc(p.medio_pago_nombre)}${p.referencia ? ` · Ref: ${esc(p.referencia)}` : ""}</td>
            <td style="padding:6px 4px;border-bottom:1px solid #f1f5f9;font-size:11.5px;font-weight:700;color:#059669;text-align:right;">${esc(money(p.monto, moneda))}</td>
          </tr>
        `).join("")}
      </table>`;

  const body = `
    <div style="padding:20px 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 4px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Tratamiento</th>
            <th style="text-align:center;padding:6px 4px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Cant.</th>
            <th style="text-align:right;padding:6px 4px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">P. Unit.</th>
            <th style="text-align:right;padding:6px 4px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:10px;">
        <div style="width:240px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:4px;"><span>Subtotal</span><span>${esc(money(presupuesto.total_bruto, moneda))}</span></div>
          ${presupuesto.descuento_monto > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#e11d48;margin-bottom:4px;"><span>Descuento (${presupuesto.descuento_porcentaje}%)</span><span>− ${esc(money(presupuesto.descuento_monto, moneda))}</span></div>` : ""}
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:800;color:#0f172a;padding-top:6px;border-top:1px solid #e2e8f0;"><span>Total</span><span>${esc(money(totalNeto, moneda))}</span></div>
        </div>
      </div>
    </div>
    <div style="padding:0 24px 20px;border-top:1px solid #e2e8f0;padding-top:16px;">
      <div style="font-size:10px;font-weight:800;color:#0e7490;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Pagos</div>
      ${pagosRows}
      <div style="display:flex;gap:20px;margin-top:10px;">
        <div><span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Pagado</span><div style="font-size:13px;font-weight:700;color:#059669;">${esc(money(pagado, moneda))}</div></div>
        <div><span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Saldo</span><div style="font-size:13px;font-weight:700;color:${saldo > 0 ? "#d97706" : "#059669"};">${esc(money(saldo, moneda))}</div></div>
      </div>
    </div>
  `;

  return wrapDocument(`${header}${body}${buildLetterheadFooter(opts.clinica)}`, 800);
}

export function PresupuestoPhase({ consultaId, pacienteId, paciente, presupuesto, mediosPago, onSaved, onNavigateTab }: {
  consultaId: string; pacienteId: string; paciente: any; mediosPago: { id: number; nombre: string }[]; onSaved?: () => void;
  presupuesto: PresupuestoData | null;
  onNavigateTab?: (tab: string) => void;
}) {
  if (presupuesto) {
    return <PresupuestoExistente pacienteId={pacienteId} paciente={paciente} presupuesto={presupuesto} mediosPago={mediosPago} onSaved={onSaved} onNavigateTab={onNavigateTab} />;
  }
  return <PresupuestoBuilder consultaId={consultaId} pacienteId={pacienteId} onSaved={onSaved} />;
}

// ─── Builder (no hay presupuesto aún) ─────────────────────────────────────────

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
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addLinea(l: Linea) {
    if (lineas.some(x => x.catalogo_id === l.catalogo_id)) {
      setLineas(prev => prev.map(x => x.catalogo_id === l.catalogo_id ? { ...x, cantidad: x.cantidad + 1 } : x));
    } else {
      setLineas(prev => [...prev, l]);
    }
  }

  async function buscar(q: string) {
    setQuery(q);
    if (q.trim().length < 2) { setResultados([]); return; }
    setBuscando(true);
    const res = await searchCatalogoAction(q);
    setResultados(res);
    setBuscando(false);
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
    if (res?.error) { setError(res.error); return; }
    onSaved?.();
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
          <Icon name="receipt_long" size={18} />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Presupuesto</h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Agrega ítems del catálogo para generar el presupuesto</p>
        </div>
      </div>

      {/* Buscador de catálogo */}
      <div className="relative">
        <Icon name="search" size={16} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
        <input value={query} onChange={e => buscar(e.target.value)}
          placeholder="Buscar tratamiento del catálogo para agregar…"
          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 bg-white dark:bg-slate-900 dark:text-slate-100" />
        {buscando && <div className="absolute right-3 top-2.5 w-4 h-4 rounded-full border-2 border-cyan-200 border-t-cyan-600 animate-spin" />}
        {resultados.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl max-h-52 overflow-y-auto z-10">
            {resultados.map(r => (
              <button key={r.id} onClick={() => { addLinea({ catalogo_id: r.id, nombre: r.nombre, cantidad: 1, precio_unitario: Number(r.precio), moneda: r.moneda ?? "PEN" }); setQuery(""); setResultados([]); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0 flex items-center justify-between gap-2">
                <span className="text-[13px] text-slate-700 dark:text-slate-300 truncate">{r.nombre}</span>
                <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">{money(Number(r.precio), r.moneda ?? "PEN")}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Líneas */}
      {lineas.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
          <Icon name="receipt_long" size={28} className="text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-[13px] text-slate-500 dark:text-slate-400">Sin ítems aún. Agrega desde el catálogo.</p>
        </div>
      ) : (
        <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-2">
          {lineas.map((l, i) => (
            <motion.div key={l.catalogo_id} variants={staggerItem} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">{l.nombre}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{money(l.precio_unitario, l.moneda)} c/u</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setLineas(prev => prev.map((x, idx) => idx === i ? { ...x, cantidad: Math.max(1, x.cantidad - 1) } : x))}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"><Icon name="remove" size={14} /></button>
                <span className="w-8 text-center text-[13px] font-semibold text-slate-700 dark:text-slate-300">{l.cantidad}</span>
                <button onClick={() => setLineas(prev => prev.map((x, idx) => idx === i ? { ...x, cantidad: x.cantidad + 1 } : x))}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"><Icon name="add" size={14} /></button>
              </div>
              <div className="w-24 text-right shrink-0">
                <input type="number" value={l.precio_unitario} min={0} step="0.01"
                  onChange={e => setLineas(prev => prev.map((x, idx) => idx === i ? { ...x, precio_unitario: Number(e.target.value) } : x))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[16px] sm:text-[13px] text-right outline-none focus:border-cyan-500 bg-white dark:bg-slate-900 dark:text-slate-100" />
              </div>
              <span className="w-24 text-right text-[13px] font-semibold text-slate-800 dark:text-slate-100 shrink-0">{money(l.cantidad * l.precio_unitario, l.moneda)}</span>
              <button onClick={() => setLineas(prev => prev.filter((_, idx) => idx !== i))}
                className="w-8 h-8 shrink-0 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"><Icon name="delete" size={15} /></button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Totales */}
      {lineas.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-700 pt-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{money(totalBruto, moneda)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              Descuento
              <span className="flex items-center gap-1">
                <input type="number" value={descuento} min={0} max={100}
                  onChange={e => setDescuento(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-16 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-[16px] sm:text-[13px] text-right outline-none focus:border-cyan-500 bg-white dark:bg-slate-900 dark:text-slate-100" />
                <span className="text-slate-400 dark:text-slate-500">%</span>
              </span>
            </span>
            <span className="font-medium text-rose-500">− {money(descMonto, moneda)}</span>
          </div>
          <div className="flex items-center justify-between text-[15px] pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Total</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{money(totalNeto, moneda)}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">Notas (opcional)</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
          placeholder="Notas adicionales u observaciones..."
          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-500 bg-slate-50 dark:bg-slate-900 dark:text-slate-100 resize-none" />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-xl text-[12px] text-red-600 dark:text-red-400">
          <Icon name="warning" size={14} className="shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end pt-2 gap-2">
        {onCancel && (
          <button onClick={onCancel} disabled={saving}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-300 rounded-xl text-[13px] font-semibold transition-colors">
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

function PresupuestoExistente({ pacienteId, paciente, presupuesto, mediosPago, onSaved, onNavigateTab }: {
  pacienteId: string; paciente?: { nombre_completo?: string } | null;
  presupuesto: PresupuestoData; mediosPago: { id: number; nombre: string }[]; onSaved?: () => void;
  onNavigateTab?: (tab: string) => void;
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
  const pagado = pagosValidos.reduce((acc, p) => acc + p.monto, 0);
  const saldo = totalNeto - pagado;

  const estadoCfg: Record<string, { bg: string; text: string; label: string }> = {
    pendiente: { bg: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400", label: "Pendiente" },
    aprobado:  { bg: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-400", label: "Aprobado" },
    cancelado: { bg: "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600", text: "text-slate-500 dark:text-slate-400", label: "Cancelado" },
  };
  const cfg = estadoCfg[presupuesto.estado] ?? estadoCfg.pendiente;

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
      const html = buildPresupuestoHtml({ clinica: sede, pacienteNombre: paciente?.nombre_completo, presupuesto, totalNeto, moneda, pagosValidos });
      if (mode === "print") await printHtml(html, `Presupuesto #${presupuesto.id}`);
      else if (mode === "pdf") await downloadHtmlAsSinglePagePdf(html, `presupuesto_${presupuesto.id}.pdf`);
      else if (mode === "telegram") {
        const canvas = await exportHtmlAsCanvas(html);
        canvas.toBlob((blob) => {
          if (!blob) {
            alert("No se pudo generar la imagen del presupuesto");
            return;
          }
          const file = new File([blob], `presupuesto_${presupuesto.id}.png`, { type: "image/png" });
          (window as any).__pendingTelegramFile = file;
          if (onNavigateTab) {
            onNavigateTab("chat");
          }
        }, "image/png");
      }
    } catch (err) {
      console.error("Error exportando presupuesto:", err);
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
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      {/* Card presupuesto */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Icon name="receipt_long" size={18} />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Presupuesto</h2>
              {(presupuesto.fecha_emision || presupuesto.doctor_nombre) && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 flex-wrap">
                  {presupuesto.fecha_emision && (
                    <span className="flex items-center gap-1"><Icon name="calendar_today" size={11} /> {fmtFechaCorta(presupuesto.fecha_emision)}</span>
                  )}
                  {presupuesto.doctor_nombre && (
                    <span className="flex items-center gap-1"><Icon name="person" size={11} /> Dr. {presupuesto.doctor_nombre}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
            {presupuesto.estado === "pendiente" && (
              <button onClick={() => setIsEditing(true)} title="Editar Presupuesto"
                className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Icon name="edit" size={13} />
              </button>
            )}
            <button onClick={() => handleExportar("print")} disabled={exportando !== null} title="Imprimir"
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">
              <Icon name="print" size={13} />
            </button>
            <button onClick={() => handleExportar("pdf")} disabled={exportando !== null} title="Descargar PDF"
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">
              <Icon name="download" size={13} />
            </button>
            <button onClick={() => handleExportar("telegram")} disabled={exportando !== null} title="Enviar por Telegram"
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#2AABEE] hover:bg-[#2AABEE]/10 disabled:opacity-40 transition-colors">
              <Icon name="send" size={13} />
            </button>
          </div>
        </div>

        {/* Detalle de ítems */}
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left border-collapse min-w-[420px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-1 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Tratamiento</th>
                <th className="px-1 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-center">Cant.</th>
                <th className="px-1 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-right">P. Unit.</th>
                <th className="px-1 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {presupuesto.items.map(it => (
                <tr key={it.id} className="border-b border-slate-50 dark:border-slate-700 last:border-0">
                  <td className="px-1 py-2.5 align-top">
                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100">{it.nombre}</p>
                    {it.descripcion && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{it.descripcion}</p>}
                  </td>
                  <td className="px-1 py-2.5 align-top text-center text-[13px] text-slate-600 dark:text-slate-300">{it.cantidad}</td>
                  <td className="px-1 py-2.5 align-top text-right text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">{money(it.precio_unitario, it.moneda)}</td>
                  <td className="px-1 py-2.5 align-top text-right text-[13px] font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">{money(it.subtotal, it.moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-700 pt-3">
          <div className="flex justify-between text-[13px]"><span className="text-slate-500 dark:text-slate-400">Subtotal</span><span className="text-slate-700 dark:text-slate-300">{money(presupuesto.total_bruto, moneda)}</span></div>
          {presupuesto.descuento_monto > 0 && (
            <div className="flex justify-between text-[13px]"><span className="text-slate-500 dark:text-slate-400">Descuento ({presupuesto.descuento_porcentaje}%)</span><span className="text-rose-500">− {money(presupuesto.descuento_monto, moneda)}</span></div>
          )}
          <div className="flex justify-between text-[15px] pt-1"><span className="font-semibold text-slate-800 dark:text-slate-100">Total</span><span className="font-bold text-slate-900 dark:text-slate-100">{money(totalNeto, moneda)}</span></div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-xl text-[12px] text-red-600 dark:text-red-400">
            <Icon name="warning" size={14} className="shrink-0" /> {error}
          </div>
        )}

        {/* Acciones de estado */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {presupuesto.estado === "pendiente" && (
            <button onClick={() => cambiarEstado("aprobado")} disabled={busy}
              className="col-span-2 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-[12px] font-semibold transition-colors">
              <Icon name="check_circle" size={15} /> Aprobar presupuesto
            </button>
          )}
          {presupuesto.estado === "aprobado" && (
            <button onClick={() => cambiarEstado("pendiente")} disabled={busy}
              className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[12px] font-medium transition-colors">
              <Icon name="undo" size={15} /> Volver a pendiente
            </button>
          )}
          {presupuesto.estado !== "cancelado" && (
            <button onClick={() => cambiarEstado("cancelado")} disabled={busy}
              className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-[12px] font-medium transition-colors">
              <Icon name="block" size={15} /> Cancelar
            </button>
          )}
          <button onClick={eliminar} disabled={busy}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-900 disabled:opacity-40 rounded-xl text-[12px] font-medium transition-colors">
            <Icon name="delete" size={14} /> Eliminar presupuesto
          </button>
        </div>
      </div>

      {/* Card pagos */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Icon name="payments" size={18} />
            </div>
            <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Pagos</h2>
          </div>
          <button onClick={() => setShowPago(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] font-semibold transition-colors">
            <Icon name={showPago ? "close" : "add"} size={14} /> {showPago ? "Cerrar" : "Registrar pago"}
          </button>
        </div>

        {/* Resumen saldo */}
        <div className="grid grid-cols-3 gap-2">
          <ResumenBox label="Total" value={money(totalNeto, moneda)} color="text-slate-800 dark:text-slate-100" />
          <ResumenBox label="Pagado" value={money(pagado, moneda)} color="text-emerald-600 dark:text-emerald-400" />
          <ResumenBox label="Saldo" value={money(saldo, moneda)} color={saldo > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"} />
        </div>

        {showPago && (
          <FormPago pacienteId={pacienteId} presupuestoId={presupuesto.id} mediosPago={mediosPago} saldoSugerido={saldo > 0 ? saldo : 0} onSaved={onSaved} />
        )}

        {/* Lista de pagos */}
        {pagosValidos.length === 0 ? (
          <p className="text-[12px] text-slate-400 dark:text-slate-500 italic text-center py-2">Aún no se ha registrado ningún pago.</p>
        ) : (
          <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-2">
            {presupuesto.pagos.map(p => (
              <motion.div key={p.id} variants={staggerItem} className={`flex items-center gap-3 p-3 border rounded-xl ${p.estado === "anulado" ? "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 opacity-60" : "border-slate-200 dark:border-slate-700"}`}>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Icon name="payments" size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{money(p.monto, moneda)} <span className="font-normal text-slate-400 dark:text-slate-500">· {p.medio_pago_nombre}</span></p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    <span suppressHydrationWarning>{new Date(p.fecha_pago).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {p.referencia && ` · Ref: ${p.referencia}`}
                    {p.estado === "anulado" && " · ANULADO"}
                  </p>
                </div>
                {p.estado !== "anulado" && (
                  <button onClick={async () => { setBusy(true); await anularPagoAction(String(p.id), String(pacienteId)); setBusy(false); onSaved?.(); }}
                    className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-colors shrink-0">Anular</button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function ResumenBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2.5 text-center">
      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-[14px] font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function FormPago({ pacienteId, presupuestoId, mediosPago, saldoSugerido, onSaved }: {
  pacienteId: string; presupuestoId: number; mediosPago: { id: number; nombre: string }[]; saldoSugerido: number; onSaved?: () => void;
}) {
  const [monto, setMonto] = useState(saldoSugerido > 0 ? String(saldoSugerido.toFixed(2)) : "");
  const [medio, setMedio] = useState<number | "">(mediosPago[0]?.id ?? "");
  const [referencia, setReferencia] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    const m = Number(monto);
    if (!m || m <= 0) { setError("Ingresa un monto válido"); return; }
    setSaving(true); setError("");
    const res = await registrarPagoAction({
      presupuesto_id: String(presupuestoId),
      monto: m,
      medio_pago_id: medio === "" ? null : String(medio),
      referencia: referencia || undefined,
      paciente_id: String(pacienteId),
    });
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    onSaved?.();
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Monto *</label>
          <input type="number" value={monto} min={0} step="0.01" onChange={e => setMonto(e.target.value)}
            placeholder="0.00"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Medio de pago</label>
          <Select
            value={medio === "" ? "" : String(medio)}
            onChange={(v) => setMedio(v === "" ? "" : Number(v))}
            options={mediosPago.map(m => ({ value: String(m.id), label: m.nombre }))}
            placeholder="— Sin medios configurados —"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Referencia (operación, voucher…)</label>
        <input value={referencia} onChange={e => setReferencia(e.target.value)}
          placeholder="Opcional"
          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
      </div>
      {error && <p className="text-[12px] text-red-600 dark:text-red-400 flex items-center gap-1.5"><Icon name="warning" size={13} /> {error}</p>}
      <button onClick={guardar} disabled={saving}
        className="flex items-center justify-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-[13px] font-semibold transition-colors">
        <Icon name="check" size={16} /> {saving ? "Registrando…" : "Confirmar pago"}
      </button>
    </div>
  );
}
