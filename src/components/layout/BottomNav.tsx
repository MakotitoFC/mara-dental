"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useAuth } from "./AuthProvider";
import { GuardedLink } from "./GuardedLink";

type NavItem = { href: string; icon: string; label: string };

// Mismas entradas que Sidebar.tsx (NAV_MAIN + ROLE_HREFS + Configuración) —
// antes este mapa traía un subconjunto recortado a mano por rol y ni
// siquiera tenía llave "superadmin" (caía en el DEFAULT_NAV de doctor). Con
// más de 4 entradas, las primeras 3 van directas y el resto vive detrás del
// botón "Más".
const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", icon: "space_dashboard", label: "Dashboard" },
  { href: "/admin/auditoria", icon: "admin_panel_settings", label: "Auditoría" },
  { href: "/admin/catalogo", icon: "medical_information", label: "Catálogo" },
  { href: "/admin/configuracion-tipos", icon: "category", label: "Config. Tipos" },
  { href: "/admin/personal", icon: "badge", label: "Personal" },
  { href: "/plantillas", icon: "article", label: "Plantillas" },
  { href: "/configuracion", icon: "settings", label: "Config." },
];

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  superadmin: ADMIN_NAV,
  admin: ADMIN_NAV,
  doctor: [
    { href: "/dashboard", icon: "home", label: "Dashboard" },
    { href: "/agenda", icon: "calendar_month", label: "Calendario" },
    { href: "/pacientes", icon: "person", label: "Pacientes" },
    { href: "/plantillas", icon: "article", label: "Plantillas" },
    { href: "/configuracion", icon: "settings", label: "Config." },
  ],
  asistente: [
    { href: "/dashboard", icon: "home", label: "Dashboard" },
    { href: "/agenda", icon: "calendar_month", label: "Calendario" },
    { href: "/pagos", icon: "payments", label: "Pagos" },
    { href: "/configuracion", icon: "settings", label: "Config." },
  ],
  contador: [
    { href: "/contador-dashboard", icon: "monitoring", label: "Dashboard" },
    { href: "/caja", icon: "wallet", label: "Caja" },
    { href: "/comprobantes", icon: "receipt_long", label: "Comprobantes" },
    { href: "/presupuestos", icon: "assignment", label: "Presupuestos y Cobranzas" },
    { href: "/proveedores", icon: "store", label: "Proveedores" },
    { href: "/categorias", icon: "category", label: "Categorías" },
    { href: "/tipo-cambio", icon: "currency_exchange", label: "Tipo Cambio" },
    { href: "/reportes", icon: "download", label: "Reportes" },
    { href: "/configuracion", icon: "settings", label: "Config." },
  ],
};

const DEFAULT_NAV: NavItem[] = NAV_BY_ROLE.doctor;

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const navItems = NAV_BY_ROLE[user?.rol ?? ""] ?? DEFAULT_NAV;

  const hasOverflow = navItems.length > 4;
  const primaryItems = hasOverflow ? navItems.slice(0, 3) : navItems;
  const overflowItems = hasOverflow ? navItems.slice(3) : [];
  const isOverflowActive = overflowItems.some((item) => isActive(item.href));

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item.href);
    return (
      <GuardedLink
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
      </GuardedLink>
    );
  }

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex">
          {primaryItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {hasOverflow && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="Más opciones"
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] transition-colors"
            >
              {isOverflowActive && (
                <motion.span
                  layoutId="bottomnav-active"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-cyan-600 rounded-b-full"
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                />
              )}
              <Icon name="more_horiz" size={22} className={isOverflowActive ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500"} />
              <span className={`text-[10px] font-medium ${isOverflowActive ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500"}`}>
                Más
              </span>
            </button>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <ResponsiveSheet onClose={() => setMoreOpen(false)} title="Más opciones">
            <div className="grid grid-cols-3 gap-3 pb-2">
              {overflowItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <GuardedLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border transition-colors ${
                      active
                        ? "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-900/30 dark:border-cyan-800 dark:text-cyan-400"
                        : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    <Icon name={item.icon} size={22} />
                    <span className="text-[11px] font-medium text-center">{item.label}</span>
                  </GuardedLink>
                );
              })}
            </div>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
    </>
  );
}
