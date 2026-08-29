import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

/** Bloques reutilizados por InfoTab (ficha completa) y el panel de vista previa de la lista de pacientes. */

export function StatTile({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
 <div className="bg-slate-50 rounded-xl p-2.5 flex flex-col gap-1">
 <Icon name={icon} size={14} className="text-slate-400"/>
      <div>
 <p className="text-[13px] font-bold text-slate-900 leading-tight truncate">{value}</p>
 <p className="text-[10px] text-slate-400 truncate">{sub ?? label}</p>
      </div>
    </div>
  );
}

export function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
 <div className={`bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 ${className}`}>
 <h3 className="text-[13px] font-bold text-slate-900 mb-1.5">{title}</h3>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

export function Row({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
  return (
 <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
 <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
 <Icon name={icon} size={15} className="text-slate-400"/>
      </div>
      <div className="min-w-0 flex-1">
 <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
 <p className="text-[13.5px] font-bold text-slate-900 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

export const TAG_COLORS: Record<string, string> = {
 rose: "bg-red-50 text-red-700 border-red-100",
 cyan: "bg-cyan-50 text-cyan-700 border-cyan-100",
 violet: "bg-violet-50 text-violet-700 border-violet-100",
 amber: "bg-amber-50 text-amber-700 border-amber-100",
};

export function TagGroup({
  label, items, color, icon,
}: { label: string; items?: string[]; color: string; icon?: string }) {
  const list = Array.isArray(items) ? items : [];
  return (
 <div className="py-2.5 border-b border-slate-100 last:border-0">
 <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
      {list.length === 0 ? (
 <p className="text-[12.5px] text-slate-300">Ninguna registrada</p>
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
 if (list.length === 0) return <p className="text-[12.5px] text-slate-300">Ninguna registrada</p>;
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
