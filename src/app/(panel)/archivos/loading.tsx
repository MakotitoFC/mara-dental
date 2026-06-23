import { Topbar } from "@/components/layout/Topbar";

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-slate-200 rounded-lg animate-pulse ${className ?? ""}`} />;
}

export default function LoadingArchivos() {
  return (
    <>
      <Topbar title="Archivos Clínicos" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">

        {/* Filtros + búsqueda */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Grid de archivos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="p-2.5 flex flex-col gap-1.5">
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
