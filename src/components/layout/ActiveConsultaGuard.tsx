"use client";

// La confirmación de "Salir de consulta" solo se disparaba al hacer click en
// el botón dedicado — cualquier otra forma de salir (sidebar, bottom nav,
// cambiar de paciente, el botón "volver") se saltaba el aviso y dejaba la
// consulta activa sin resolver. `consultaId` vive como estado local dentro
// de HistoriaView, invisible para el Sidebar/BottomNav, así que este
// contexto global expone un único punto de navegación: cualquier link que
// pueda sacar al usuario de la ficha del paciente pasa por `guardedNavigate`,
// que solo interrumpe la navegación si HistoriaView registró una consulta
// activa (`setActiveConsultaExit`).

import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";

type ExitHandler = () => void;

interface ActiveConsultaGuardValue {
  setActiveConsultaExit: (onExit: ExitHandler | null) => void;
  guardedNavigate: (href: string) => void;
}

const ActiveConsultaGuardContext = createContext<ActiveConsultaGuardValue | null>(null);

export function useActiveConsultaGuard() {
  const ctx = useContext(ActiveConsultaGuardContext);
  if (!ctx) throw new Error("useActiveConsultaGuard debe usarse dentro de <ActiveConsultaGuardProvider>");
  return ctx;
}

export function ActiveConsultaGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const exitRef = useRef<ExitHandler | null>(null);

  const setActiveConsultaExit = useCallback((onExit: ExitHandler | null) => {
    exitRef.current = onExit;
  }, []);

  const guardedNavigate = useCallback(
    async (href: string) => {
      if (!exitRef.current) {
        router.push(href);
        return;
      }
      const ok = await confirm({
        title: "Salir de la consulta",
        message: "Vas a salir de la consulta en curso. Lo que ya guardaste se mantiene, pero dejarás de estar en modo consulta.",
        requireText: "salir de consulta",
        confirmLabel: "Salir de consulta",
      });
      if (!ok) return;
      exitRef.current?.();
      exitRef.current = null;
      toast.success("Saliste de la consulta correctamente");
      router.push(href);
    },
    [confirm, router, toast],
  );

  return (
    <ActiveConsultaGuardContext.Provider value={{ setActiveConsultaExit, guardedNavigate }}>
      {children}
    </ActiveConsultaGuardContext.Provider>
  );
}
