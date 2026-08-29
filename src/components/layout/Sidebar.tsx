"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "./AuthProvider";
import { GuardedLink } from "./GuardedLink";
import { createClient } from "@/lib/supabase/client";

const NAV_MAIN = [
  { href: "/dashboard",       icon: "home",             label: "Dashboard" },
  { href: "/admin/dashboard", icon: "space_dashboard", label: "Dashboard" },
  { href: "/admin/catalogo",  icon: "medical_information", label: "Catálogo Precios" },
  { href: "/admin/configuracion-tipos", icon: "category", label: "Config. Tipos" },
  { href: "/admin/personal",  icon: "person",          label: "Personal" },
  { href: "/agenda",          icon: "calendar_month",  label: "Calendario" },
  { href: "/pacientes",       icon: "person",          label: "Pacientes" },
  { href: "/plantillas",      icon: "article",         label: "Plantillas" },
  { href: "/admin/auditoria", icon: "admin_panel_settings", label: "Auditoría" },
  { href: "/admin/validaciones", icon: "verified",     label: "Validaciones" },
  { href: "/pagos",           icon: "payments",        label: "Pagos" },
  
  // Contador
  { href: "/contador-dashboard",  icon: "monitoring",          label: "Dashboard" },
  { href: "/caja",                icon: "wallet",              label: "Caja" },
  { href: "/comprobantes",        icon: "receipt_long",        label: "Comprobantes" },
  { href: "/presupuestos",        icon: "assignment",          label: "Presupuestos y Cobranzas" },
  { href: "/proveedores",         icon: "store",               label: "Proveedores" },
  { href: "/categorias",          icon: "category",            label: "Categorías" },
  { href: "/tipo-cambio",         icon: "currency_exchange",   label: "Tipo Cambio" },
  { href: "/reportes",            icon: "download",            label: "Reportes" },
];

const NAV_BOTTOM = [{ href: "/configuracion", icon: "settings", label: "Configuración" }];

const ROLE_HREFS: Record<string, string[]> = {
  superadmin: ["/admin/dashboard", "/admin/auditoria", "/admin/catalogo", "/admin/configuracion-tipos", "/admin/personal", "/plantillas", "/admin/validaciones"],
  admin:     ["/admin/dashboard", "/admin/auditoria", "/admin/reportes", "/admin/catalogo", "/admin/configuracion-tipos", "/admin/personal", "/plantillas", "/admin/validaciones"],
  doctor:    ["/dashboard", "/agenda", "/pacientes", "/plantillas"],
  asistente: ["/dashboard", "/agenda", "/pagos"],
  contador:  [
    "/contador-dashboard",
    "/caja",
    "/comprobantes",
    "/presupuestos",
    "/proveedores",
    "/categorias",
    "/tipo-cambio",
    "/reportes"
  ],
};

const COLLAPSE_KEY = "maradental:sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [validacionesCount, setValidacionesCount] = useState(0);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!user || (user.rol !== "admin" && user.rol !== "superadmin") || !user.sede_id) return;
    const supabase = createClient();

    // Fetch inicial
    supabase.from("solicitud_validacion")
      .select("*", { count: "exact", head: true })
      .eq("sede_id", user.sede_id)
      .eq("estado", "pendiente")
      .then(({ count }) => {
        if (count !== null) setValidacionesCount(count);
      });

    // Subscripción en tiempo real
    const refetchCount = () => {
      supabase.from("solicitud_validacion")
        .select("*", { count: "exact", head: true })
        .eq("sede_id", user.sede_id!)
        .eq("estado", "pendiente")
        .then(({ count }) => {
          if (count !== null) setValidacionesCount(count);
        });
    };

    const channel = supabase.channel("validaciones_sidebar")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "solicitud_validacion",
        filter: `sede_id=eq.${user.sede_id}`
      }, refetchCount)
      .on("broadcast", { event: "NEW_VALIDACION" }, (payload) => {
        if (!payload.payload?.sede_id || payload.payload?.sede_id === user.sede_id) {
          refetchCount();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const userRole = user?.rol ?? "";
  const allowedHrefs = ROLE_HREFS[userRole] ?? NAV_MAIN.map((n) => n.href);
  const visibleNav = NAV_MAIN.filter((n) => allowedHrefs.includes(n.href));
  const mainItems = visibleNav;

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 224 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
 className="hidden md:flex flex-col shrink-0 bg-white h-screen sticky top-0 border-r border-slate-200 overflow-hidden print:hidden"
    >
      {/* Logo + toggle */}
      <div
 className={`flex border-b border-slate-200 shrink-0 ${
          collapsed ? "items-center justify-center py-2.5" : "items-center justify-between px-3 h-16"
        }`}
      >
        {collapsed ? (
          <button
            onClick={toggle}
            aria-label="Expandir menú"
            title="Expandir menú"
 className="w-11 h-11 flex items-center justify-center shrink-0 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Image src="/Logo_Cian.png" alt="Mara Dental — expandir menú" width={28} height={28} className="object-contain" />
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
 className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Icon name="chevron_left" size={16} />
            </button>
          </>
        )}
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 py-3 overflow-y-auto no-scrollbar overflow-x-hidden">
        {mainItems.map((item) => {
          const active = isActive(item.href);
          return (
            <GuardedLink
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 mx-2 px-2.5 py-2.5 rounded-lg transition-colors mb-0.5 group ${collapsed ? "justify-center" : ""} ${
                active
 ? "bg-cyan-50 text-cyan-700"
 :"text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="relative shrink-0">
                <Icon
                  name={item.icon}
                  size={20}
 className={`${active ? "text-cyan-700" : "text-slate-400 group-hover:text-slate-600"}`}
                />
                {item.href === "/admin/validaciones" && validacionesCount > 0 && (
                  <span className={`absolute -top-1 -right-1 flex items-center justify-center bg-red-500 text-white font-bold rounded-full text-[9px] ${collapsed ? 'w-4 h-4' : 'w-4 h-4'}`}>
                    {validacionesCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-[13px] font-medium truncate">{item.label}</span>
                  {item.href === "/admin/validaciones" && validacionesCount > 0 && (
 <span className="shrink-0 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {validacionesCount}
                    </span>
                  )}
                </div>
              )}
            </GuardedLink>
          );
        })}
      </nav>

      {/* Pie: configuración + usuario */}
 <div className="border-t border-slate-200 py-3">
        {NAV_BOTTOM.map((item) => {
          const active = isActive(item.href);
          return (
            <GuardedLink
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 mx-2 px-2.5 py-2.5 rounded-lg transition-colors mb-0.5 group ${collapsed ? "justify-center" : ""} ${
                active
 ? "bg-cyan-50 text-cyan-700"
 :"text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                name={item.icon}
                size={20}
 className={`shrink-0 ${active ? "text-cyan-700" : "text-slate-400 group-hover:text-slate-600"}`}
              />
              {!collapsed && <span className="text-[13px] font-medium truncate">{item.label}</span>}
            </GuardedLink>
          );
        })}

        <a
          href="#"
          onClick={(e) => { e.preventDefault(); logout(); }}
          title={collapsed ? "Cerrar sesión" : undefined}
 className={`flex items-center gap-3 mx-2 px-2.5 py-2.5 rounded-lg mb-0.5 group transition-colors text-slate-500 hover:bg-red-600 hover:text-white ${collapsed ? "justify-center" : ""}`}
        >
          <Icon
            name="logout"
            size={20}
 className="shrink-0 text-slate-400 transition-colors group-hover:text-white"
          />
          {!collapsed && <span className="text-[13px] font-medium truncate">Cerrar sesión</span>}
        </a>

        <div className={`flex items-center gap-2 mx-2 px-2 py-2 rounded-lg mt-1 ${collapsed ? "justify-center" : ""}`}>
 <div className="w-8 h-8 rounded-full bg-cyan-50 border-2 border-cyan-200 flex items-center justify-center shrink-0">
 <span className="text-[11px] font-bold text-cyan-700">{user?.initials ?? "…"}</span>
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
 <p className="text-[12px] font-semibold text-slate-900 truncate">{user?.name ?? "Cargando…"}</p>
 <p className="text-[10px] text-slate-500 truncate">{user?.rol ?? ""}</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
