// src/components/offline/PwaProvider.tsx
"use client";

import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { useAuth } from "@/components/layout/AuthProvider";
import { syncOfflineData } from "@/lib/offline/sync";

interface PwaContextValue {
  canInstall: boolean;
  installPwa: () => Promise<void>;
  dismissBanner: () => void;
  showBanner: boolean;
}

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  installPwa: async () => {},
  dismissBanner: () => {},
  showBanner: false,
});

export function usePwa() {
  return useContext(PwaContext);
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  // El modo offline y el PWA aplican exclusivamente al rol doctor_admin (rol_id === 6)
  const isDoctorAdmin = user?.rol_id === 6;

  useEffect(() => {
    if (!isDoctorAdmin || typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // 1. Registro del Service Worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PwaProvider] Service Worker registrado con alcance:", reg.scope);

        // Si hay una actualización esperando, activarla
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // Inspeccionar chunks de la página actual y enviarlos al SW para caché dinámico
        const scripts = Array.from(document.querySelectorAll('script[src^="/_next/static/"]')).map(
          (s) => (s as HTMLScriptElement).src
        );
        const links = Array.from(
          document.querySelectorAll('link[rel="stylesheet"][href^="/_next/static/"]')
        ).map((l) => (l as HTMLLinkElement).href);

        const currentChunks = Array.from(new Set([...scripts, ...links]));
        if (currentChunks.length > 0 && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "CACHE_URLS",
            urls: currentChunks,
          });
        }
      })
      .catch((err) => {
        console.warn("[PwaProvider] Error al registrar Service Worker:", err);
      });

    // 2. Manejo de beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      const dismissed = localStorage.getItem("pwa_install_dismissed");
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 3. Sincronización inicial y ante reconexión online
    if (navigator.onLine && user?.sede_id) {
      syncOfflineData(user.sede_id).catch(() => {});
    }

    const handleOnline = () => {
      console.log("[PwaProvider] Red online detectada -> re-sincronizando sede...");
      if (user?.sede_id) {
        syncOfflineData(user.sede_id).catch(() => {});
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("online", handleOnline);
    };
  }, [isDoctorAdmin, user?.sede_id]);

  const installPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("[PwaProvider] Resultado instalación PWA:", outcome);
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const dismissBanner = () => {
    localStorage.setItem("pwa_install_dismissed", "true");
    setShowBanner(false);
  };

  return (
    <PwaContext.Provider
      value={{
        canInstall: Boolean(deferredPrompt),
        installPwa,
        dismissBanner,
        showBanner,
      }}
    >
      {children}
      {showBanner && isDoctorAdmin && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[9999] bg-white border border-cyan-200 shadow-xl rounded-2xl p-4 flex items-start gap-3.5 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0 text-cyan-600">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-bold text-slate-900 leading-tight">
              Instalar Mara Dental PWA
            </h4>
            <p className="text-[11.5px] text-slate-500 mt-1 leading-normal">
              Instala la aplicación en tu dispositivo para acceder a tus consultas y pacientes incluso sin conexión a internet.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={installPwa}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[12px] font-semibold transition-colors"
              >
                Instalar ahora
              </button>
              <button
                type="button"
                onClick={dismissBanner}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 text-[12px] font-medium transition-colors"
              >
                Más tarde
              </button>
            </div>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  );
}
