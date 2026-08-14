import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingConfiguracion() {
  return (
    <>
      <Header title="Configuración" />
      <div className="p-4 sm:p-6 flex flex-col gap-6 max-w-6xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <Skeleton className="h-3.5 w-40" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex flex-col gap-1.5">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
