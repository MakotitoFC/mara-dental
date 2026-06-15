"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";

const NAV_MAIN = [
  { href: "/dashboard", icon: "space_dashboard", label: "Inicio" },
  { href: "/agenda", icon: "calendar_month", label: "Calendario" },
  { href: "/pacientes", icon: "person", label: "Pacientes" },
  { href: "/archivos", icon: "photo_library", label: "Archivos" },
  { href: "/presupuestos", icon: "payments", label: "Presupuestos" },
  { href: "/plantillas", icon: "article", label: "Plantillas" },
];

const NAV_BOTTOM = [
  { href: "/configuracion", icon: "settings", label: "Configuración" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="hidden md:flex flex-col w-[52px] lg:w-[220px] shrink-0 bg-white h-screen sticky top-0 border-r border-slate-200">
      {/* Logo */}
      <div className="flex items-center justify-center lg:justify-start px-3 lg:px-4 h-[52px] border-b border-slate-200 shrink-0 overflow-hidden">
        {/* Ícono solo (sidebar colapsado) */}
        <div className="lg:hidden shrink-0">
          <Image src="/logo.png" alt="Mara Dental" width={32} height={32} className="object-contain" />
        </div>
        {/* Logo completo (sidebar expandido) */}
        <div className="hidden lg:block">
          <Image src="/logo.png" alt="Mara Dental Group" width={160} height={36} className="object-contain" />
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_MAIN.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 mx-2 px-2 py-2.5 rounded-lg transition-colors mb-0.5 group ${
                active
                  ? "bg-cyan-50 text-cyan-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                name={item.icon}
                size={20}
                className={`shrink-0 ${
                  active
                    ? "text-cyan-700"
                    : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              <span className="hidden lg:block text-[13px] font-medium truncate">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Configuración + usuario */}
      <div className="border-t border-slate-200 py-3">
        {NAV_BOTTOM.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 mx-2 px-2 py-2.5 rounded-lg transition-colors mb-0.5 group ${
                active
                  ? "bg-cyan-50 text-cyan-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                name={item.icon}
                size={20}
                className={`shrink-0 ${
                  active ? "text-cyan-700" : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              <span className="hidden lg:block text-[13px] font-medium truncate">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Avatar usuario */}
        <div className="flex items-center gap-3 mx-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors mt-1">
          <div className="w-8 h-8 rounded-full bg-cyan-50 border-2 border-cyan-200 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-cyan-700">DG</span>
          </div>
          <div className="hidden lg:block min-w-0">
            <p className="text-[12px] font-semibold text-slate-900 truncate">Dr. García</p>
            <p className="text-[10px] text-slate-500 truncate">Odontólogo</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
