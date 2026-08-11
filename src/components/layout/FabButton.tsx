"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

/** Acción contextual por sección — se amplía a medida que cada módulo agrega su flujo de creación. */
const FAB_ROUTES: Record<string, { href: string; label: string }> = {};

export function FabButton() {
  const pathname = usePathname();
  const section = "/" + (pathname.split("/")[1] ?? "");
  const isExactSection = pathname === section;
  const config = isExactSection ? FAB_ROUTES[section] : undefined;

  if (!config) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="md:hidden fixed right-4 z-40 print:hidden"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 16px)" }}
    >
      <Link
        href={config.href}
        aria-label={config.label}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-cyan-600 text-white shadow-lg active:scale-95 transition-transform"
      >
        <Icon name="add" size={26} />
      </Link>
    </motion.div>
  );
}
