"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "./AuthProvider";
import type { AuthUser } from "@/types/auth";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { FabButton } from "./FabButton";
import { ActiveConsultaGuardProvider } from "./ActiveConsultaGuard";
import { fadeIn } from "@/lib/animations";

export function DashboardShell({ children, initialUser }: { children: React.ReactNode; initialUser: AuthUser | null }) {
  const pathname = usePathname();

  return (
    <AuthProvider initialUser={initialUser}>
      <ActiveConsultaGuardProvider>
        {/* h-dvh (no h-screen): 100vh en Safari/Chrome mobile se calcula con
            la barra de direcciones ya colapsada, pero al cargar la página (o
            si el usuario no hizo scroll aún) esa barra sigue visible y el
            área real es más chica — el layout completo quedaba más alto que
            lo visible, y ningún scroll interno alcanzaba a compensarlo
            (síntoma: el final del contenido, ej. Alertas Logísticas, se
            cortaba sin que hubiera forma de llegar a él). dvh sí se ajusta
            a la altura visible real en todo momento. */}
        <div className="flex h-dvh bg-slate-50 dark:bg-slate-950 overflow-hidden print:h-auto print:overflow-visible print:bg-white">
          <Sidebar />
          {/* calc() en vez de un pb-N fijo: BottomNav mide 56px +
              env(safe-area-inset-bottom) (el "home indicator" de iPhones sin
              botón físico agrega ~34px más ahí) — un pb-N aproximado (24,
              28...) unas veces apenas la libraba sin dejar separación
              visible y otras se quedaba corto según el dispositivo. Este
              calc() despeja la nav exactamente, sin aire extra (las vistas
              que necesitan separación visual la agregan ellas mismas). */}
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0 no-scrollbar print:h-auto print:overflow-visible print:pb-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex-1 flex flex-col min-w-0 min-h-0 print:h-auto print:overflow-visible"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
          <BottomNav />
          <FabButton />
        </div>
      </ActiveConsultaGuardProvider>
    </AuthProvider>
  );
}
