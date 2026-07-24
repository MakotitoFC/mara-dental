"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "./AuthProvider";

type NavItem = { href: string; icon: string; label: string };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  Administrador: [
    { href: "/dashboard", icon: "home", label: "Dashboard" },
    { href: "/agenda", icon: "calendar_month", label: "Calendario" },
    { href: "/pacientes", icon: "person", label: "Pacientes" },
    { href: "/configuracion", icon: "settings", label: "Más" },
  ],
  Doctor: [
    { href: "/dashboard", icon: "home", label: "Dashboard" },
    { href: "/agenda", icon: "calendar_month", label: "Calendario" },
    { href: "/pacientes", icon: "person", label: "Pacientes" },
    { href: "/configuracion", icon: "settings", label: "Más" },
  ],
  Asistente: [
    { href: "/dashboard", icon: "home", label: "Dashboard" },
    { href: "/agenda", icon: "calendar_month", label: "Calendario" },
    { href: "/pacientes", icon: "person", label: "Pacientes" },
    { href: "/configuracion", icon: "settings", label: "Más" },
  ],
  Contador: [
    { href: "/dashboard", icon: "home", label: "Dashboard" },
    { href: "/presupuestos", icon: "payments", label: "Pagos" },
    { href: "/archivos", icon: "photo_library", label: "Archivos" },
    { href: "/configuracion", icon: "settings", label: "Más" },
  ],
};

const DEFAULT_NAV: NavItem[] = NAV_BY_ROLE.Doctor;

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const navItems = NAV_BY_ROLE[user?.rol ?? ""] ?? DEFAULT_NAV;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] transition-colors"
            >
              {active && (
                <motion.span
                  layoutId="bottomnav-active"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-cyan-600 rounded-b-full"
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                />
              )}
              <motion.div animate={{ scale: active ? 1.08 : 1 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}>
                <Icon name={item.icon} size={22} className={active ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500"} />
              </motion.div>
              <span className={`text-[10px] font-medium ${active ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
