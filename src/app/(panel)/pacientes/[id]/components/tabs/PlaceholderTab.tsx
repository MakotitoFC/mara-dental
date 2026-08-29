import { Icon } from "@/components/ui/Icon";

/** Empty-state consistente para módulos aún no construidos como pantalla propia
 *  (Diagnósticos, Tratamientos, Archivos, Recetas, Presupuestos — Módulos 4/5/6/8 del roadmap). */
export function PlaceholderTab({
  icon, title, description,
}: { icon: string; title: string; description: string }) {
  return (
 <div className="bg-white rounded-2xl border border-slate-200 py-16 px-6 flex flex-col items-center text-center gap-3">
 <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
 <Icon name={icon} size={32} className="text-slate-300"/>
      </div>
 <p className="text-[15px] font-bold text-slate-700">{title}</p>
 <p className="text-[12.5px] text-slate-400 max-w-xs leading-relaxed">{description}</p>
    </div>
  );
}
