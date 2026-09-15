"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Textarea } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import {
  registrarAjusteAperturaAction,
  type AjusteAperturaPendiente,
} from "../caja.actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface AjusteAperturaObligatorioProps {
  cajaId: string;
  ajustesPendientes: AjusteAperturaPendiente[];
  fechaCierreAnterior: string | null;
  fechaAperturaActual: string;
  categoriasIngreso: { id: number; nombre: string }[];
  categoriasEgreso: { id: number; nombre: string }[];
  monedas?: { id: number; moneda: string }[];
}

function toDatetimeLocal(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatReadable(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AjusteAperturaObligatorio({
  cajaId,
  ajustesPendientes,
  fechaCierreAnterior,
  fechaAperturaActual,
  categoriasIngreso,
  categoriasEgreso,
  monedas,
}: AjusteAperturaObligatorioProps) {
  const router = useRouter();
  const toast = useToast();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actual = ajustesPendientes[index];
  const esIngreso = actual?.tipo === "I";

  const categoriasDisponibles = esIngreso ? categoriasIngreso : categoriasEgreso;
  const [categoriaId, setCategoriaId] = useState<string>(
    categoriasDisponibles[0] ? String(categoriasDisponibles[0].id) : ""
  );
  const [observacion, setObservacion] = useState(
    `Ajuste por diferencia de apertura en ${actual?.medio_pago_nombre ?? "caja"}`
  );

  // Fecha del consumo / movimiento
  const [fechaInput, setFechaInput] = useState<string>(() =>
    toDatetimeLocal(fechaAperturaActual)
  );

  // Tipo de moneda
  const defaultMonedaId =
    monedas?.find((m) => m.moneda === "PEN")?.id || monedas?.[0]?.id || 1;
  const [tipoMonedaId, setTipoMonedaId] = useState<number>(defaultMonedaId);

  if (!actual) return null;

  const minDatetime = fechaCierreAnterior ? toDatetimeLocal(fechaCierreAnterior) : undefined;
  const maxDatetime = toDatetimeLocal(fechaAperturaActual);

  const isFechaInRange = () => {
    if (!fechaInput) return false;
    const t = new Date(fechaInput).getTime();
    if (isNaN(t)) return false;
    if (fechaCierreAnterior) {
      const minT = new Date(fechaCierreAnterior).getTime();
      if (t < minT - 60000) return false;
    }
    const maxT = new Date(fechaAperturaActual).getTime();
    if (t > maxT + 60000) return false;
    return true;
  };

  const handleRegistrar = async () => {
    if (!fechaInput) {
      setError("Debe ingresar la fecha y hora en la que se realizó el consumo o movimiento.");
      return;
    }

    if (!isFechaInRange()) {
      setError(
        `La fecha debe ser igual o estar dentro del período entre el cierre anterior (${formatReadable(
          fechaCierreAnterior
        )}) y la apertura actual (${formatReadable(fechaAperturaActual)}).`
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await registrarAjusteAperturaAction({
        caja_id: cajaId,
        medio_pago_id: actual.medio_pago_id,
        monto: actual.diferencia,
        tipo: actual.tipo,
        fecha: new Date(fechaInput).toISOString(),
        tipo_moneda_id: tipoMonedaId,
        categoria_id: categoriaId ? Number(categoriaId) : undefined,
        observacion: observacion.trim(),
      });

      if (res?.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success(
          `Movimiento de ajuste (${esIngreso ? "Ingreso" : "Egreso"}) registrado correctamente.`
        );
        if (index + 1 < ajustesPendientes.length) {
          setIndex(index + 1);
          const sig = ajustesPendientes[index + 1];
          const sigCats = sig.tipo === "I" ? categoriasIngreso : categoriasEgreso;
          setCategoriaId(sigCats[0] ? String(sigCats[0].id) : "");
          setObservacion(`Ajuste por diferencia de apertura en ${sig.medio_pago_nombre}`);
          setFechaInput(toDatetimeLocal(fechaAperturaActual));
        } else {
          router.refresh();
        }
      }
    } catch {
      setError("Error inesperado al registrar el ajuste.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-100/70 p-4 sm:p-6 min-h-screen">
      <div className="max-w-lg w-full bg-white border border-amber-200/90 rounded-2xl p-6 sm:p-7 shadow-xl">
        {/* Cabecera de Alerta */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Icon name="balance" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                Paso Obligatorio
              </span>
              {ajustesPendientes.length > 1 && (
                <span className="text-[11px] font-medium text-slate-400">
                  {index + 1} de {ajustesPendientes.length}
                </span>
              )}
            </div>
            <h2 className="text-[16px] font-bold text-slate-900 mt-0.5">
              Ajuste de Apertura de Caja Requerido
            </h2>
          </div>
        </div>

        <p className="text-[12.5px] text-slate-600 mb-4 leading-relaxed">
          Al aperturar la caja se ingresó un saldo que <strong>no coincide</strong> con el cierre anterior para el medio de pago{" "}
          <strong className="text-slate-900">{actual.medio_pago_nombre}</strong>. Para mantener la caja cuadrada y el balance correcto, debes registrar el movimiento correspondiente antes de continuar.
        </p>

        {/* Tarjeta de Comparación de Montos */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 mb-5 space-y-2.5">
          <div className="flex justify-between items-center text-[12.5px]">
            <span className="text-slate-500">Cierre anterior registrado:</span>
            <span className="font-semibold text-slate-700">
              S/ {actual.monto_anterior.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[12.5px]">
            <span className="text-slate-500">Monto ingresado de apertura:</span>
            <span className="font-semibold text-slate-700">
              S/ {actual.monto_apertura.toFixed(2)}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-200/70 flex justify-between items-center text-[13.5px]">
            <span className="font-bold text-slate-800">
              Movimiento a registrar ({esIngreso ? "Ingreso" : "Egreso"}):
            </span>
            <span
              className={`font-extrabold ${
                esIngreso ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {esIngreso ? "+" : "−"} S/ {actual.diferencia.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Formulario para registrar el movimiento */}
        <div className="space-y-4 mb-5">
          {/* Fecha del consumo o movimiento */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Fecha y hora del consumo / movimiento <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              min={minDatetime}
              max={maxDatetime}
              value={fechaInput}
              onChange={(e) => setFechaInput(e.target.value)}
              className="w-full h-10 border border-slate-300 rounded-xl px-3 py-2 text-[13px] bg-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-colors"
            />
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
              <Icon name="pending_actions" size={13} className="shrink-0 text-cyan-600" />
              <span>
                Rango permitido:{" "}
                <strong className="text-slate-700">
                  {fechaCierreAnterior ? formatReadable(fechaCierreAnterior) : "Inicio"}
                </strong>{" "}
                hasta{" "}
                <strong className="text-slate-700">{formatReadable(fechaAperturaActual)}</strong>
              </span>
            </div>
            {!isFechaInRange() && fechaInput && (
              <p className="text-[11.5px] text-red-500 mt-1 font-medium">
                La fecha debe ser igual o encontrarse dentro del período entre el cierre anterior y la apertura de hoy.
              </p>
            )}
          </div>

          {/* Moneda (si hay opciones) */}
          {monedas && monedas.length > 1 && (
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Moneda
              </label>
              <Select
                value={String(tipoMonedaId)}
                onChange={(v) => setTipoMonedaId(Number(v))}
                options={monedas.map((m) => ({
                  value: String(m.id),
                  label: m.moneda,
                }))}
                className="w-full"
              />
            </div>
          )}

          {/* Categoría */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Categoría del {esIngreso ? "Ingreso" : "Egreso"}
            </label>
            <Select
              value={categoriaId}
              onChange={(v) => setCategoriaId(v)}
              options={categoriasDisponibles.map((c) => ({
                value: String(c.id),
                label: c.nombre,
              }))}
              placeholder="Seleccionar categoría…"
              className="w-full"
            />
          </div>

          {/* Observación / Justificación */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Observación / Justificación de la diferencia
            </label>
            <Textarea
              rows={3}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej. Consumo de insumos no registrado previamente..."
              className="w-full bg-slate-50"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 text-red-600 rounded-lg text-[12px] font-medium flex items-center gap-2">
            <Icon name="warning" size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Botón de Envío */}
        <button
          type="button"
          onClick={handleRegistrar}
          disabled={saving || !isFechaInRange()}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[13.5px] font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Icon name="progress_activity" size={16} className="animate-spin" />
              <span>Registrando movimiento de ajuste...</span>
            </>
          ) : (
            <>
              <Icon name="check_circle" size={17} />
              <span>
                Registrar {esIngreso ? "Ingreso" : "Egreso"} y{" "}
                {index + 1 < ajustesPendientes.length ? "Siguiente" : "Continuar a Pagos"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
