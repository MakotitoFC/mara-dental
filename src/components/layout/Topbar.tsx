"use client";

import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "./AuthProvider";

interface TopbarProps {
  title: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 h-[52px] bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Mobile: logo; Desktop: título de página */}
      <div className="flex items-center gap-3">
        <div className="md:hidden shrink-0">
          <Image src="/logo.png" alt="Mara Dental" width={110} height={28} className="object-contain" />
        </div>
        <h1 className="hidden md:block text-[15px] font-semibold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {actions}

        {/* Notificaciones */}
        <button className="relative w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
          <Icon name="notifications" size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>

        {/* Avatar (desktop — logout ya está en el sidebar) */}
        <div className="hidden md:flex w-8 h-8 rounded-full bg-cyan-50 border-2 border-cyan-200 items-center justify-center" title={user?.name ?? ""}>
          <span className="text-[11px] font-bold text-cyan-700">
            {user?.initials ?? "…"}
          </span>
        </div>

        {/* Logout explícito en mobile */}
        <button
          onClick={logout}
          title="Cerrar sesión"
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
        >
          <Icon name="logout" size={17} />
        </button>
      </div>
    </header>
  );
}
