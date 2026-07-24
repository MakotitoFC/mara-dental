import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingPacientes() {
  return (
    <>
      <Header title="Pacientes" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3 max-w-180">

        {/* Barra de búsqueda + botón */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-full max-w-70 rounded-xl" />
          <Skeleton className="hidden md:block h-10 w-28 rounded-xl shrink-0 ml-auto" />
        </div>

        {/* Lista de tarjetas skeleton */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3">
              <Skeleton className="w-11 h-11 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-2.5 w-3/5" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
