import { Skeleton } from "./Skeleton";

/** Fila de "Historial" — igual forma en Diagnóstico y Presupuesto: fecha +
 * nombre/detalle a la izquierda, badge de estado a la derecha. */
function HistorialRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 border-l-2 border-l-transparent">
      <Skeleton className="w-2 h-2 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-4 w-16 rounded-full shrink-0" />
    </div>
  );
}

/** Tarjeta "Historial" (título + conteo + botón de filtro, tarjeta blanca con
 * borde) — misma cabecera que usan Diagnóstico y Presupuesto en desktop. */
function HistorialCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="w-5 h-5 rounded-full" />
        </div>
        <Skeleton className="w-9 h-9 rounded-lg" />
      </div>
      <div className="flex flex-col divide-y divide-slate-100 border-t border-slate-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <HistorialRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton de la vista Diagnóstico (fuera de consulta activa) — Detalle e
 * Historial del mismo ancho (lg:grid-cols-2), igual que el layout real. */
export function DiagnosticoSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className="flex flex-col gap-4 min-w-0">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
          <div className="p-5 flex flex-col gap-2.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-12 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col gap-2.5">
          <Skeleton className="h-3.5 w-40" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
      <HistorialCardSkeleton />
    </div>
  );
}

/** Skeleton de la vista de Recetas (embebida en Diagnóstico). */
export function RecetaSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="p-5 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton de la vista de Presupuesto (fuera de consulta activa) — Detalle e
 * Historial del mismo ancho (lg:grid-cols-2), igual que el layout real. */
export function PresupuestoSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col gap-3 min-w-0">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-16 shrink-0" />
          </div>
        ))}
        <Skeleton className="h-9 w-full rounded-xl mt-2" />
      </div>
      <HistorialCardSkeleton />
    </div>
  );
}

/** Skeleton del Odontograma: dentadura fija a un costado (mismo ancho/alto
 * que el gráfico real) + Historial de Exámenes centrado, tipo timeline. */
export function OdontogramaSkeleton() {
  return (
    <div className="flex flex-col md:flex-row w-full">
      <div className="w-full md:flex-none md:w-[26rem] xl:w-[30rem] flex flex-col items-center gap-4 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-200">
        <div className="flex items-center gap-3 w-full">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
        <div className="w-full max-w-[13rem] aspect-[409/694] rounded-[40%] skeleton-shimmer" />
      </div>
      <div className="w-full md:flex-1 flex justify-center p-4 sm:p-6">
        <div className="w-full max-w-[620px] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="w-9 h-9 rounded-lg" />
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" />
                <div className="flex-1 min-w-0 rounded-xl border border-slate-200 p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-1/2 rounded-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
