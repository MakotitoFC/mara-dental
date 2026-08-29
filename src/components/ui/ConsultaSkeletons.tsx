import { Skeleton } from "./Skeleton";

/** Skeleton de la vista Diagnóstico + Plan de trabajo (grid de 2 columnas). */
export function DiagnosticoSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
 <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
 <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <div className="p-5 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-4 w-12 rounded shrink-0" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-4 w-16 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
 <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col gap-3">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
 <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col gap-2.5">
          <Skeleton className="h-3.5 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton de la vista de Recetas. */
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

/** Skeleton de la vista de Presupuesto (2 columnas: detalle | pagos). */
export function PresupuestoSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      {Array.from({ length: 2 }).map((_, col) => (
 <div key={col} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
 <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="p-5 flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-16 shrink-0" />
              </div>
            ))}
            <Skeleton className="h-9 w-full rounded-xl mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton del Odontograma: chart circular + historial de exámenes. */
export function OdontogramaSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
      <div className="w-full lg:flex-1 flex flex-col gap-3">
        <Skeleton className="h-8 w-40 rounded-lg" />
 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col items-center gap-4">
          <div className="relative w-full max-w-[220px] aspect-square rounded-full skeleton-shimmer" />
          <Skeleton className="h-8 w-48 rounded-full" />
        </div>
      </div>
      <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-3">
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
