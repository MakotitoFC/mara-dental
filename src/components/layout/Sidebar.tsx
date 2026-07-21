"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "./AuthProvider";

const NAV_MAIN = [
  { href: "/dashboard", icon: "home", label: "Dashboard" },
  { href: "/agenda", icon: "calendar_month", label: "Calendario" },
  { href: "/pacientes", icon: "person", label: "Pacientes" },
];

const NAV_BOTTOM = [{ href: "/configuracion", icon: "settings", label: "Configuración" }];

const ROLE_HREFS: Record<string, string[]> = {
  Administrador: ["/dashboard", "/agenda", "/pacientes"],
  Doctor: ["/dashboard", "/agenda", "/pacientes"],
  Asistente: ["/dashboard", "/agenda", "/pacientes"],
  Contador: ["/dashboard", "/pacientes"],
};

const COLLAPSE_KEY = "maradental:sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const allowedHrefs = ROLE_HREFS[user?.rol ?? ""] ?? NAV_MAIN.map((n) => n.href);
  const visibleNav = NAV_MAIN.filter((n) => allowedHrefs.includes(n.href));

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 224 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="hidden md:flex flex-col shrink-0 bg-white dark:bg-slate-900 h-screen sticky top-0 border-r border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      {/* Logo + toggle */}
      <div
        className={`flex border-b border-slate-200 dark:border-slate-800 shrink-0 ${
          collapsed ? "items-center justify-center py-2.5" : "items-center justify-between px-3 h-16"
        }`}
      >
        {collapsed ? (
          <button
            onClick={toggle}
            aria-label="Expandir menú"
            title="Expandir menú"
            className="w-11 h-11 flex items-center justify-center shrink-0 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Image src="/Logo_Cian.png" alt="Mara Dental — expandir menú" width={44} height={44} className="object-contain" />
          </button>
        ) : (
          <>
            <div className="flex items-center min-w-0 relative h-11 w-full">
              <Image
                src="/Cian_MaraDental.png"
                alt="Mara Dental Group"
                width={180} height={44}
                className="object-contain"
                style={{ maxHeight: 44, width: "auto" }}
              />
            </div>
            <button
              onClick={toggle}
              aria-label="Colapsar menú"
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon name="chevron_left" size={16} />
            </button>
          </>
        )}
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {visibleNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 mx-2 px-2.5 py-2.5 rounded-lg transition-colors mb-0.5 group ${collapsed ? "justify-center" : ""} ${
                active
                  ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Icon
                name={item.icon}
                size={20}
                className={`shrink-0 ${active ? "text-cyan-700 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}
              />
              {!collapsed && <span className="text-[13px] font-medium truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Pie: configuración + usuario */}
      <div className="border-t border-slate-200 dark:border-slate-800 py-3">
        {NAV_BOTTOM.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 mx-2 px-2.5 py-2.5 rounded-lg transition-colors mb-0.5 group ${collapsed ? "justify-center" : ""} ${
                active
                  ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Icon
                name={item.icon}
                size={20}
                className={`shrink-0 ${active ? "text-cyan-700 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}
              />
              {!collapsed && <span className="text-[13px] font-medium truncate">{item.label}</span>}
            </Link>
          );
        })}

        <div className={`flex items-center gap-2 mx-2 px-2 py-2 rounded-lg mt-1 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-900/40 border-2 border-cyan-200 dark:border-cyan-800 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400">{user?.initials ?? "…"}</span>
          </div>

          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.name ?? "Cargando…"}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.rol ?? ""}</p>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="flex w-7 h-7 items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
              >
                <Icon name="logout" size={16} />
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="flex items-center justify-center w-full py-2 mt-1 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors rounded-lg"
          >
            <Icon name="logout" size={18} />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
