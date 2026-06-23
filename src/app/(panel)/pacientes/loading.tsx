import { Topbar } from "@/components/layout/Topbar";

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-slate-200 rounded-lg animate-pulse ${className ?? ""}`} />;
}

export default function LoadingPacientes() {
  return (
    <>
      <Topbar title="Pacientes" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">

        {/* Barra de búsqueda + botón */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-36 shrink-0" />
        </div>

        {/* Tarjetas skeleton — grid responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
