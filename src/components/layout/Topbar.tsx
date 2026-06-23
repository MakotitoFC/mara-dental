"use client";

import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "./AuthProvider";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface TopbarProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export function Topbar({ title, breadcrumbs, actions }: TopbarProps) {
  const { user, logout } = useAuth();

  const backHref = breadcrumbs && breadcrumbs.length >= 2
    ? (breadcrumbs[breadcrumbs.length - 2].href ?? "/")
    : "/";

  const currentLabel = breadcrumbs?.[breadcrumbs.length - 1]?.label ?? "";

  return (
    <header className="sticky top-0 z-20 h-[52px] bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">

      {/* Lado izquierdo */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        {breadcrumbs ? (
          <>
            {/* Flecha volver */}
            <Link
              href={backHref}
              aria-label="Volver"
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            >
              <Icon name="chevron_left" size={18} />
            </Link>

            {/* Mobile: solo el nombre de la página actual */}
            <span className="sm:hidden text-[14px] font-semibold text-slate-900 truncate ml-0.5">
              {currentLabel}
            </span>

            {/* Desktop (sm+): trail completo — separadores del mismo tamaño que la flecha */}
            <nav className="hidden sm:flex items-center min-w-0">
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <span key={i} className="flex items-center min-w-0">
                    {i > 0 && (
                      <Icon name="chevron_right" size={18} className="text-slate-300 shrink-0 mx-0.5" />
                    )}
                    {isLast ? (
                      <span className="text-[14px] font-semibold text-slate-900 truncate max-w-[200px] lg:max-w-sm">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href ?? "#"}
                        className="text-[13px] text-slate-500 hover:text-slate-800 transition-colors shrink-0 whitespace-nowrap"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
          </>
        ) : (
          /* Páginas de nivel superior: logo en mobile, título en desktop */
          <>
            <div className="md:hidden shrink-0">
              <Image src="/logo.png" alt="Mara Dental" width={110} height={28} className="object-contain" />
            </div>
            <h1 className="hidden md:block text-[15px] font-semibold text-slate-900">{title}</h1>
          </>
        )}
      </div>

      {/* Lado derecho */}
      <div className="flex items-center gap-2 shrink-0">
        {actions}

        {/* Notificaciones */}
        <button className="relative w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
          <Icon name="notifications" size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>

        {/* Salir — solo mobile */}
        <button
          onClick={logout}
          className="md:hidden w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
          title="Cerrar sesión"
        >
          <Icon name="logout" size={17} />
        </button>

        {/* Avatar (desktop) */}
        <div
          className="hidden md:flex w-8 h-8 rounded-full bg-cyan-50 border-2 border-cyan-200 items-center justify-center"
          title={user?.name ?? ""}
        >
          <span className="text-[11px] font-bold text-cyan-700">{user?.initials ?? "…"}</span>
        </div>
      </div>
    </header>
  );
}
