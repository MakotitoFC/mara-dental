import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

/** Bloques reutilizados por InfoTab (ficha completa) y el panel de vista previa de la lista de pacientes. */

export function StatTile({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-2.5 flex flex-col gap-1">
      <Icon name={icon} size={14} className="text-slate-400 dark:text-slate-500" />
      <div>
        <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">{value}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sub ?? label}</p>
      </div>
    </div>
  );
}

export function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 ${className}`}>
      <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 mb-1.5">{title}</h3>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

export function Row({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center shrink-0">
        <Icon name={icon} size={15} className="text-slate-400 dark:text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

export const TAG_COLORS: Record<string, string> = {
  rose: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800",
  cyan: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800",
  violet: "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-100 dark:border-violet-800",
  amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800",
};

export function TagGroup({
  label, items, color, icon,
}: { label: string; items?: string[]; color: string; icon?: string }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <p className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{label}</p>
      {list.length === 0 ? (
        <p className="text-[12.5px] text-slate-300 dark:text-slate-600">Ninguna registrada</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.map((it) => (
            <span
              key={it}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${TAG_COLORS[color]}`}
            >
              {icon && <Icon name={icon} size={10} />}
              {it}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Igual que TagGroup pero sin encabezado propio (la tarjeta contenedora ya trae el título). */
export function TagGroupPlain({ items, color }: { items?: string[]; color: string }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return <p className="text-[12.5px] text-slate-300 dark:text-slate-600">Ninguna registrada</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((it) => (
        <span key={it} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${TAG_COLORS[color]}`}>
          {it}
        </span>
      ))}
    </div>
  );
}
