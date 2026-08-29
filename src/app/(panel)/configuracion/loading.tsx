import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";

function SeccionSkeleton() {
  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
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
  );
}

/** No se sabe el rol todavía en este punto (loading.tsx corre antes de que
 * la Server Component resuelva la data), así que no se puede saber si va a
 * mostrarse solo "Información Personal" (contador/asistente) o esa sección
 * más una segunda (Sede para admin/superadmin, Firma+Horario para doctor).
 * Se muestra una sola hoja continua con dos secciones (separadas por una
 * línea, igual que el patrón real) — se acerca razonablemente a ambos casos
 * sin sobre-representar ninguno. Queda centrada con ancho máximo, tarjeta
 * propia y margen respecto al borde de la pantalla en cualquier tamaño
 * (desktop, tablet y mobile). */
export default function LoadingConfiguracion() {
  return (
    <>
      <Header title="Configuración" />
      <div className="flex flex-col gap-6 h-full items-center justify-center px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 w-full max-w-2xl">
          <SeccionSkeleton />
          <SeccionSkeleton />
        </div>
      </div>
    </>
  );
}
