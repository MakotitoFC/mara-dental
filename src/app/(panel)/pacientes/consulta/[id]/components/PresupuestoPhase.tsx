"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  searchCatalogoAction,
  crearPresupuestoAction,
  updateEstadoPresupuestoAction,
  deletePresupuestoAction,
  registrarPagoAction,
  anularPagoAction,
} from "../actions";

type Sugerido = { catalogo_tratamiento_id: number; nombre: string; precio: number; moneda: string };
type Linea = { catalogo_id: number; nombre: string; cantidad: number; precio_unitario: number; moneda: string };

interface PresupuestoData {
  id: number;
  total_bruto: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  estado: string;
  fecha_aprobacion: string | null;
  notas: string | null;
  items: { id: number; nombre: string; moneda: string; cantidad: number; precio_unitario: number; subtotal: number }[];
  pagos: { id: number; monto: number; medio_pago_nombre: string; referencia: string | null; estado: string; fecha_pago: string }[];
}

const money = (n: number, m = "PEN") => `${m === "PEN" ? "S/" : m} ${n.toFixed(2)}`;

export function PresupuestoPhase({ consultaId, pacienteId, sugeridos, presupuesto, mediosPago }: {
  consultaId: number;
  pacienteId: number;
  sugeridos: Sugerido[];
  presupuesto: PresupuestoData | null;
  mediosPago: { id: number; nombre: string }[];
}) {
  if (presupuesto) {
    return <PresupuestoExistente consultaId={consultaId} presupuesto={presupuesto} mediosPago={mediosPago} />;
  }
  return <PresupuestoBuilder consultaId={consultaId} pacienteId={pacienteId} sugeridos={sugeridos} />;
}

// ─── Builder (no hay presupuesto aún) ─────────────────────────────────────────

function PresupuestoBuilder({ consultaId, pacienteId, sugeridos }: {
  consultaId: number; pacienteId: number; sugeridos: Sugerido[];
}) {
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [descuento, setDescuento] = useState(0);
  const [notas, setNotas] = useState("");
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

  async function crear() {
    if (lineas.length === 0) { setError("Agrega al menos un ítem"); return; }
    setSaving(true); setError("");
    const res = await crearPresupuestoAction({
      paciente_id: pacienteId,
      consulta_id: consultaId,
      items: lineas.map(l => ({ catalogo_id: l.catalogo_id, cantidad: l.cantidad, precio_unitario: l.precio_unitario })),
      descuento_porcentaje: descuento,
      notas: notas || undefined,
    });
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    window.location.reload();
  }

  const sugeridosDisponibles = sugeridos.filter(s => !lineas.some(l => l.catalogo_id === s.catalogo_tratamiento_id));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
          <Icon name="receipt_long" size={18} />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-slate-800">Presupuesto</h2>
          <p className="text-[11px] text-slate-400">Genera el presupuesto a partir de los tratamientos o agrega ítems del catálogo</p>
        </div>
      </div>

      {/* Sugeridos desde tratamientos */}
      {sugeridosDisponibles.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Tratamientos de esta consulta</p>
          <div className="flex flex-wrap gap-2">
            {sugeridosDisponibles.map(s => (
              <button key={s.catalogo_tratamiento_id} type="button"
                onClick={() => addLinea({ catalogo_id: s.catalogo_tratamiento_id, nombre: s.nombre, cantidad: 1, precio_unitario: s.precio, moneda: s.moneda })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-cyan-700 bg-cyan-50 border border-cyan-100 hover:bg-cyan-100 transition-colors">
                <Icon name="add" size={14} /> {s.nombre} <span className="text-cyan-500">· {money(s.precio, s.moneda)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Buscador de catálogo */}
      <div className="relative">
        <Icon name="search" size={16} className="absolute left-3 top-2.5 text-slate-400" />
        <input value={query} onChange={e => buscar(e.target.value)}
          placeholder="Buscar tratamiento del catálogo para agregar…"
          className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
        {buscando && <div className="absolute right-3 top-2.5 w-4 h-4 rounded-full border-2 border-cyan-200 border-t-cyan-600 animate-spin" />}
        {resultados.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl max-h-52 overflow-y-auto z-10">
            {resultados.map(r => (
              <button key={r.id} onClick={() => { addLinea({ catalogo_id: r.id, nombre: r.nombre, cantidad: 1, precio_unitario: Number(r.precio), moneda: r.moneda ?? "PEN" }); setQuery(""); setResultados([]); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between gap-2">
                <span className="text-[13px] text-slate-700 truncate">{r.nombre}</span>
                <span className="text-[12px] font-semibold text-slate-500 shrink-0">{money(Number(r.precio), r.moneda ?? "PEN")}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Líneas */}
      {lineas.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Icon name="receipt_long" size={28} className="text-slate-300 mb-2" />
          <p className="text-[13px] text-slate-500">Sin ítems aún. Agrega desde los tratamientos o el catálogo.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {lineas.map((l, i) => (
            <div key={l.catalogo_id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
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
                  className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[12px] text-right outline-none focus:border-cyan-500" />
              </div>
              <span className="w-24 text-right text-[13px] font-semibold text-slate-800 shrink-0">{money(l.cantidad * l.precio_unitario, l.moneda)}</span>
              <button onClick={() => setLineas(prev => prev.filter((_, idx) => idx !== i))}
                className="w-8 h-8 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Icon name="delete" size={15} /></button>
            </div>
          ))}
        </div>
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
                  className="w-16 border border-slate-200 rounded-lg px-2 py-0.5 text-[12px] text-right outline-none focus:border-cyan-500" />
                <span className="text-slate-400">%</span>
              </span>
            </span>
            <span className="font-medium text-rose-500">− {money(descMonto, moneda)}</span>
          </div>
          <div className="flex items-center justify-between text-[15px] pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-800">Total</span>
            <span className="font-bold text-slate-900">{money(totalNeto, moneda)}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-slate-700">Notas (opcional)</label>
        <input value={notas} onChange={e => setNotas(e.target.value)}
          placeholder="Condiciones, validez del presupuesto…"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-[12px] text-red-600">
          <Icon name="warning" size={14} className="shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={crear} disabled={saving || lineas.length === 0}
          className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-xl text-[13px] font-semibold transition-colors">
          <Icon name="receipt_long" size={16} />
          {saving ? "Generando…" : "Generar presupuesto"}
        </button>
      </div>
    </div>
  );
}

// ─── Presupuesto existente (estados + pagos) ──────────────────────────────────

function PresupuestoExistente({ consultaId, presupuesto, mediosPago }: {
  consultaId: number; presupuesto: PresupuestoData; mediosPago: { id: number; nombre: string }[];
}) {
  const [busy, setBusy] = useState(false);
  const [showPago, setShowPago] = useState(false);
  const [error, setError] = useState("");

  const moneda = presupuesto.items[0]?.moneda ?? "PEN";
  const totalNeto = presupuesto.total_bruto - presupuesto.descuento_monto;
  const pagosValidos = presupuesto.pagos.filter(p => p.estado !== "anulado");
  const pagado = pagosValidos.reduce((acc, p) => acc + p.monto, 0);
  const saldo = totalNeto - pagado;

  const estadoCfg: Record<string, { bg: string; text: string; label: string }> = {
    pendiente: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Pendiente" },
    aprobado:  { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Aprobado" },
    cancelado: { bg: "bg-slate-100 border-slate-200", text: "text-slate-500", label: "Cancelado" },
  };
  const cfg = estadoCfg[presupuesto.estado] ?? estadoCfg.pendiente;

  async function cambiarEstado(estado: string) {
    setBusy(true); setError("");
    const res = await updateEstadoPresupuestoAction({ presupuesto_id: presupuesto.id, estado, consulta_id: consultaId });
    setBusy(false);
    if (res?.error) { setError(res.error); return; }
    window.location.reload();
  }

  async function eliminar() {
    if (!confirm("¿Eliminar este presupuesto y todos sus pagos? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    await deletePresupuestoAction(presupuesto.id, consultaId);
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card presupuesto */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Icon name="receipt_long" size={18} />
            </div>
            <h2 className="text-[14px] font-semibold text-slate-800">Presupuesto</h2>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        </div>

        {/* Ítems */}
        <div className="flex flex-col gap-1.5">
          {presupuesto.items.map(it => (
            <div key={it.id} className="flex items-center justify-between text-[13px] py-1.5 border-b border-slate-50 last:border-0">
              <span className="text-slate-700">{it.nombre} <span className="text-slate-400">×{it.cantidad}</span></span>
              <span className="font-medium text-slate-800">{money(it.subtotal, it.moneda)}</span>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
          <div className="flex justify-between text-[13px]"><span className="text-slate-500">Subtotal</span><span className="text-slate-700">{money(presupuesto.total_bruto, moneda)}</span></div>
          {presupuesto.descuento_monto > 0 && (
            <div className="flex justify-between text-[13px]"><span className="text-slate-500">Descuento ({presupuesto.descuento_porcentaje}%)</span><span className="text-rose-500">− {money(presupuesto.descuento_monto, moneda)}</span></div>
          )}
          <div className="flex justify-between text-[15px] pt-1"><span className="font-semibold text-slate-800">Total</span><span className="font-bold text-slate-900">{money(totalNeto, moneda)}</span></div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-[12px] text-red-600">
            <Icon name="warning" size={14} className="shrink-0" /> {error}
          </div>
        )}

        {/* Acciones de estado */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {presupuesto.estado === "pendiente" && (
            <button onClick={() => cambiarEstado("aprobado")} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-[12px] font-semibold transition-colors">
              <Icon name="check_circle" size={15} /> Aprobar presupuesto
            </button>
          )}
          {presupuesto.estado === "aprobado" && (
            <button onClick={() => cambiarEstado("pendiente")} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[12px] font-medium transition-colors">
              <Icon name="undo" size={15} /> Volver a pendiente
            </button>
          )}
          {presupuesto.estado !== "cancelado" && (
            <button onClick={() => cambiarEstado("cancelado")} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-[12px] font-medium transition-colors">
              <Icon name="block" size={15} /> Cancelar
            </button>
          )}
          <button onClick={eliminar} disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-xl text-[12px] font-medium transition-colors ml-auto">
            <Icon name="delete" size={15} /> Eliminar
          </button>
        </div>
      </div>

      {/* Card pagos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Icon name="payments" size={18} />
            </div>
            <h2 className="text-[14px] font-semibold text-slate-800">Pagos</h2>
          </div>
          <button onClick={() => setShowPago(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] font-semibold transition-colors">
            <Icon name={showPago ? "close" : "add"} size={14} /> {showPago ? "Cerrar" : "Registrar pago"}
          </button>
        </div>

        {/* Resumen saldo */}
        <div className="grid grid-cols-3 gap-2">
          <ResumenBox label="Total" value={money(totalNeto, moneda)} color="text-slate-800" />
          <ResumenBox label="Pagado" value={money(pagado, moneda)} color="text-emerald-600" />
          <ResumenBox label="Saldo" value={money(saldo, moneda)} color={saldo > 0 ? "text-amber-600" : "text-emerald-600"} />
        </div>

        {showPago && (
          <FormPago consultaId={consultaId} presupuestoId={presupuesto.id} mediosPago={mediosPago} saldoSugerido={saldo > 0 ? saldo : 0} />
        )}

        {/* Lista de pagos */}
        {pagosValidos.length === 0 ? (
          <p className="text-[12px] text-slate-400 italic text-center py-2">Aún no se ha registrado ningún pago.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {presupuesto.pagos.map(p => (
              <div key={p.id} className={`flex items-center gap-3 p-3 border rounded-xl ${p.estado === "anulado" ? "border-slate-100 bg-slate-50 opacity-60" : "border-slate-200"}`}>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <Icon name="payments" size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800">{money(p.monto, moneda)} <span className="font-normal text-slate-400">· {p.medio_pago_nombre}</span></p>
                  <p className="text-[11px] text-slate-400">
                    <span suppressHydrationWarning>{new Date(p.fecha_pago).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {p.referencia && ` · Ref: ${p.referencia}`}
                    {p.estado === "anulado" && " · ANULADO"}
                  </p>
                </div>
                {p.estado !== "anulado" && (
                  <button onClick={async () => { setBusy(true); await anularPagoAction(p.id, consultaId); window.location.reload(); }}
                    className="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors shrink-0">Anular</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResumenBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center">
      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-[14px] font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function FormPago({ consultaId, presupuestoId, mediosPago, saldoSugerido }: {
  consultaId: number; presupuestoId: number; mediosPago: { id: number; nombre: string }[]; saldoSugerido: number;
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
      presupuesto_id: presupuestoId,
      monto: m,
      medio_pago_id: medio === "" ? null : Number(medio),
      referencia: referencia || undefined,
      consulta_id: consultaId,
    });
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-600">Monto *</label>
          <input type="number" value={monto} min={0} step="0.01" onChange={e => setMonto(e.target.value)}
            placeholder="0.00"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-500 bg-white" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-600">Medio de pago</label>
          <select value={medio} onChange={e => setMedio(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-500 bg-white">
            {mediosPago.length === 0 && <option value="">— Sin medios configurados —</option>}
            {mediosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-slate-600">Referencia (operación, voucher…)</label>
        <input value={referencia} onChange={e => setReferencia(e.target.value)}
          placeholder="Opcional"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-500 bg-white" />
      </div>
      {error && <p className="text-[12px] text-red-600 flex items-center gap-1.5"><Icon name="warning" size={13} /> {error}</p>}
      <button onClick={guardar} disabled={saving}
        className="flex items-center justify-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-[13px] font-semibold transition-colors">
        <Icon name="check" size={16} /> {saving ? "Registrando…" : "Confirmar pago"}
      </button>
    </div>
  );
}
