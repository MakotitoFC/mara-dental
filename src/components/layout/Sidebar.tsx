"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "./AuthProvider";

const NAV_MAIN = [
  { href: "/dashboard",    icon: "space_dashboard", label: "Inicio" },
  { href: "/agenda",       icon: "calendar_month",  label: "Calendario" },
  { href: "/pacientes",    icon: "person",          label: "Pacientes" },
  { href: "/archivos",     icon: "photo_library",   label: "Archivos" },
  { href: "/presupuestos", icon: "payments",        label: "Presupuestos" },
  { href: "/plantillas",   icon: "article",         label: "Plantillas" },
];

const NAV_BOTTOM = [
  { href: "/configuracion", icon: "settings", label: "Configuración" },
];

const ROLE_HREFS: Record<string, string[]> = {
  Administrador: ["/dashboard", "/agenda", "/pacientes", "/archivos", "/presupuestos", "/plantillas"],
  Doctor:        ["/dashboard", "/agenda", "/pacientes", "/archivos"],
  Asistente:     ["/dashboard", "/agenda", "/pacientes", "/archivos"],
  Contador:      ["/dashboard", "/presupuestos", "/archivos"],
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const allowedHrefs = ROLE_HREFS[user?.rol ?? ""] ?? NAV_MAIN.map((n) => n.href);
  const visibleNav   = NAV_MAIN.filter((n) => allowedHrefs.includes(n.href));

  return (
    <aside className="hidden md:flex flex-col w-13 lg:w-55 shrink-0 bg-white h-screen sticky top-0 border-r border-slate-200">
      {/* Logo */}
      <div className="flex items-center justify-center lg:justify-start px-3 lg:px-4 h-13 border-b border-slate-200 shrink-0 overflow-hidden">
        <div className="lg:hidden shrink-0">
          <Image src="/logo.png" alt="Mara Dental" width={32} height={32} className="object-contain" />
        </div>
        <div className="hidden lg:block">
          <Image src="/logo.png" alt="Mara Dental Group" width={160} height={36} className="object-contain" />
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {visibleNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 mx-2 px-2 py-2.5 rounded-lg transition-colors mb-0.5 group ${
                active ? "bg-cyan-50 text-cyan-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                name={item.icon}
                size={20}
                className={`shrink-0 ${active ? "text-cyan-700" : "text-slate-400 group-hover:text-slate-600"}`}
              />
              <span className="hidden lg:block text-[13px] font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Pie: configuración + usuario */}
      <div className="border-t border-slate-200 py-3">
        {NAV_BOTTOM.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 mx-2 px-2 py-2.5 rounded-lg transition-colors mb-0.5 group ${
                active ? "bg-cyan-50 text-cyan-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                name={item.icon}
                size={20}
                className={`shrink-0 ${active ? "text-cyan-700" : "text-slate-400 group-hover:text-slate-600"}`}
              />
              <span className="hidden lg:block text-[13px] font-medium truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Fila de usuario + logout */}
        <div className="flex items-center gap-2 mx-2 px-2 py-2 rounded-lg mt-1">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-cyan-50 border-2 border-cyan-200 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-cyan-700">
              {user?.initials ?? "…"}
            </span>
          </div>

          {/* Nombre + rol */}
          <div className="hidden lg:block min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-slate-900 truncate">{user?.name ?? "Cargando…"}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.rol ?? ""}</p>
          </div>

          {/* Logout (sidebar expandido) */}
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>

        {/* Logout (sidebar colapsado) */}
        <button
          onClick={logout}
          title="Cerrar sesión"
          className="lg:hidden flex items-center justify-center w-full py-2 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg"
        >
          <Icon name="logout" size={18} />
        </button>
      </div>
    </aside>
  );
}
