"use client";

import { Icon } from "@/components/ui/Icon";

interface TopbarProps {
  title: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 h-[52px] bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <h1 className="text-[15px] font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-2">
        {actions}

        {/* Notificaciones */}
        <button className="relative w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
          <Icon name="notifications" size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-cyan-50 border-2 border-cyan-200 flex items-center justify-center cursor-pointer">
          <span className="text-[11px] font-bold text-cyan-700">DG</span>
        </div>
      </div>
    </header>
  );
}
