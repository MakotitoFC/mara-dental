import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Ver mara-dental-design-spec.md sección 2.2 — reemplaza los ESTADO_CFG /
// getEstadoBadge() duplicados en PresupuestoTab.tsx, PresupuestoPhase.tsx,
// presupuestos/ClientView.tsx y cuentas-por-cobrar/ClientView.tsx.
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
  {
    variants: {
      status: {
        pending:  "bg-amber-50 text-amber-700 border border-amber-200",
        success:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
        error:    "bg-red-50 text-red-700 border border-red-200",
        neutral:  "bg-slate-100 text-slate-600 border border-slate-200",
        info:     "bg-cyan-50 text-cyan-700 border border-cyan-200",
        canceled: "bg-slate-100 text-slate-500 border border-slate-200",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, status, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ status, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
