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
        {/* pb-[...] acá (no en <main>): BottomNav es `fixed`, así que no
              empuja contenido — solo lo tapa visualmente. Un padding-bottom
              en <main> (el contenedor con scroll) solo genera espacio
              extra AL FINAL del scroll, y si el contenido ya entra completo
              en una pantalla (sin necesitar scroll), ese padding nunca se
              activa: <main> sigue midiendo el alto completo del viewport y
              lo último que caiga en la franja de la nav queda tapado sin
              forma de revelarlo (bug real que tuvimos acá). La solución
              correcta es reducir la altura de ESTA fila flex (Sidebar+main)
              para que <main> nunca llegue a ocupar la franja del nav fijo,
              sea cual sea el alto real del contenido. BottomNav mide ~57px
              (56px + borde) + env(safe-area-inset-bottom) (el "home
              indicator" de iPhones sin botón físico agrega ~34px más ahí).
              IMPORTANTE: dentro de un calc() de Tailwind el operador +/-
              necesita espacios a los lados (usar "_" para el espacio) — sin
              ellos el calc() entero es CSS inválido y el navegador descarta
              la declaración completa en silencio, sin error en consola. */}
 <div className="flex h-dvh bg-slate-50 overflow-hidden pb-[calc(56px_+_env(safe-area-inset-bottom))] md:pb-0 print:h-auto print:overflow-visible print:bg-white print:pb-0">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar print:h-auto print:overflow-visible">
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
