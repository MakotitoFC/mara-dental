import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingDashboardDirectivo() {
  return (
    <>
      <Header title="Dashboard Directivo" />
 <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
 <header className="flex flex-col gap-4 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="hidden sm:block w-10 h-10 rounded-xl shrink-0" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-9 rounded-xl" />
            <Skeleton className="h-9 rounded-xl" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto no-scrollbar flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <Skeleton className="h-3.5 w-40" />
                </div>
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
