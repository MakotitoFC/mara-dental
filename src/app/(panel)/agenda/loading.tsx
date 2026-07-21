import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingAgenda() {
  return (
    <>
      <Header title="Calendario de Citas" />
      <div className="flex-1 flex flex-col gap-3 p-3 sm:p-4 md:p-6 bg-slate-50/40 dark:bg-slate-900/40">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg ml-auto" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        {/* Grid semanal */}
        <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="p-3 border-r border-slate-100 dark:border-slate-700 last:border-r-0 flex flex-col items-center gap-1.5">
                <Skeleton className="h-2.5 w-8" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1">
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} className="border-r border-slate-100 dark:border-slate-700 last:border-r-0 p-2 flex flex-col gap-1.5">
                {Array.from({ length: col % 3 === 0 ? 2 : col % 2 === 0 ? 1 : 0 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
