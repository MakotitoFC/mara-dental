"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "./AuthProvider";

type NavItem = { href: string; icon: string; label: string };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  Administrador: [
    { href: "/dashboard",  icon: "space_dashboard", label: "Inicio" },
    { href: "/agenda",     icon: "calendar_month",  label: "Agenda" },
    { href: "/pacientes",  icon: "person",          label: "Pacientes" },
    { href: "/archivos",   icon: "photo_library",   label: "Archivos" },
  ],
  Doctor: [
    { href: "/dashboard",  icon: "space_dashboard", label: "Inicio" },
    { href: "/agenda",     icon: "calendar_month",  label: "Agenda" },
    { href: "/pacientes",  icon: "person",          label: "Pacientes" },
    { href: "/archivos",   icon: "photo_library",   label: "Archivos" },
  ],
  Asistente: [
    { href: "/dashboard",  icon: "space_dashboard", label: "Inicio" },
    { href: "/agenda",     icon: "calendar_month",  label: "Agenda" },
    { href: "/pacientes",  icon: "person",          label: "Pacientes" },
    { href: "/archivos",   icon: "photo_library",   label: "Archivos" },
  ],
  Contador: [
    { href: "/dashboard",   icon: "space_dashboard", label: "Inicio" },
    { href: "/presupuestos", icon: "payments",       label: "Pagos" },
    { href: "/archivos",    icon: "photo_library",   label: "Archivos" },
    { href: "/configuracion", icon: "settings",      label: "Ajustes" },
  ],
};

const DEFAULT_NAV: NavItem[] = [
  { href: "/dashboard",  icon: "space_dashboard", label: "Inicio" },
  { href: "/agenda",     icon: "calendar_month",  label: "Agenda" },
  { href: "/pacientes",  icon: "person",          label: "Pacientes" },
  { href: "/archivos",   icon: "photo_library",   label: "Archivos" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navItems = NAV_BY_ROLE[user?.rol ?? ""] ?? DEFAULT_NAV;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200">
      <div className="flex">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                active ? "text-cyan-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-cyan-600 rounded-b-full" />
              )}
              <Icon name={item.icon} size={22} className={active ? "text-cyan-600" : "text-slate-400"} />
              <span className={`text-[10px] font-medium ${active ? "text-cyan-600" : "text-slate-400"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Botón logout siempre visible */}
        <button
          onClick={logout}
          className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-slate-400 hover:text-red-500 transition-colors"
        >
          <Icon name="logout" size={22} />
          <span className="text-[10px] font-medium">Salir</span>
        </button>
      </div>
    </nav>
  );
}
