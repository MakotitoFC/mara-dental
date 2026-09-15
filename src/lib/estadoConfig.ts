import type { BadgeProps } from "@/components/ui/Badge";

// Config de estado (dot + status de <Badge/> + label) para Presupuestos —
// antes duplicada casi byte-a-byte entre PresupuestoTab.tsx y
// PresupuestoPhase.tsx. Ver mara-dental-design-spec.md sección 2.2.
export const ESTADO_PRESUPUESTO_CFG: Record<string, { dot: string; status: BadgeProps["status"]; label: string }> = {
  pendiente: { dot: "bg-amber-400", status: "pending", label: "Pendiente" },
  aprobado:  { dot: "bg-cyan-500",  status: "info",    label: "Aprobado" },
  pagado:    { dot: "bg-emerald-500", status: "success", label: "Pagado" },
  cancelado: { dot: "bg-slate-300", status: "canceled", label: "Cancelado" },
};
