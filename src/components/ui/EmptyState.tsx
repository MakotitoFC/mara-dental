import { Icon } from "@/components/ui/Icon";

// Ver mara-dental-design-spec.md sección 2.5 — reemplaza las 4 fórmulas de
// "sin datos" repartidas en PacientesView.tsx, ArchivosView.tsx, PagosView.tsx,
// ValidacionesView.tsx y las tablas del contador.
export interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  size?: "md" | "sm";
}

export function EmptyState({ icon, title, description, size = "md" }: EmptyStateProps) {
  if (size === "sm") {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Icon name={icon} className="text-slate-300 mb-2" size={24} />
        <p className="text-[11px] font-medium text-slate-500">{title}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
        <Icon name={icon} className="text-slate-400" size={28} />
      </div>
      <h3 className="text-[14px] font-semibold text-slate-900 mb-1">{title}</h3>
      {description && <p className="text-[11px] font-medium text-slate-500 max-w-xs">{description}</p>}
    </div>
  );
}
