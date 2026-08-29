import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";

const TABS = ["Info", "Timeline", "Dental", "Diagnóstico", "Archivos", "Presup.", "Chat"];

export default function LoadingPaciente() {
  return (
    <>
      <Header breadcrumbs={[{ label: "Pacientes", href: "/pacientes" }, { label: "Cargando…" }]} />
 <div className="flex flex-col min-h-full bg-slate-50/40">

        {/* Sub-header paciente */}
 <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-6 md:px-8 py-3 sm:py-4 bg-white border-b border-slate-200 shrink-0">
          <Skeleton className="w-11 h-11 sm:w-12 sm:h-12 rounded-full shrink-0" />
          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden sm:block h-8 w-36 rounded-xl" />
          <Skeleton className="hidden sm:block h-8 w-20 rounded-xl" />
        </div>

        {/* Tab bar */}
 <div className="bg-white border-b border-slate-200 shrink-0">
          <div className="flex gap-1 px-3 sm:px-6 md:px-8 py-2.5">
            {TABS.map((t) => (
              <Skeleton key={t} className="h-8 w-20 rounded-full shrink-0" />
            ))}
          </div>
        </div>

        {/* Contenido — layout de InfoTab */}
        <div className="flex-1 min-h-0 p-3 sm:p-4 md:p-6 overflow-x-hidden">
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            <div className="flex flex-col gap-4 w-full lg:flex-1">
 <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <Skeleton className="h-3.5 w-40 mb-3" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              </div>
 <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col gap-3">
                <Skeleton className="h-3.5 w-32" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <Skeleton className="w-2 h-2 rounded-full shrink-0" />
                    <Skeleton className="h-3 flex-1" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full lg:flex-1 lg:min-w-0 lg:max-w-md">
              {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col gap-2.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
