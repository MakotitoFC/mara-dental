import { Topbar } from "@/components/layout/Topbar";

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-slate-200 rounded-lg animate-pulse ${className ?? ""}`} />;
}

export default function LoadingDashboard() {
  return (
    <>
      <Topbar title="Inicio" />
      <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">

        {/* Stats cards — misma proporción que el dashboard real */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Sección principal */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-2.5 w-1/4" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
