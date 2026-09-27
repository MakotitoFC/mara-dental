// src/components/offline/SyncStatusChip.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/layout/AuthProvider";
import { db, type SyncMeta } from "@/lib/offline/db";
import { syncOfflineData } from "@/lib/offline/sync";
import { Icon } from "@/components/ui/Icon";

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "hace un momento";
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 60) return "hace un momento";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

export function SyncStatusChip() {
  const { user } = useAuth();
  const [meta, setMeta] = useState<SyncMeta | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Solo se muestra para doctor_admin (rol_id === 6)
  if (user?.rol_id !== 6) return null;

  async function loadMeta() {
    try {
      const record = await db.sync_meta.get("all");
      if (record) setMeta(record);
    } catch {}
  }

  useEffect(() => {
    setIsOnline(typeof navigator === "undefined" || navigator.onLine);
    loadMeta();

    const handleCompleted = () => {
      loadMeta();
    };

    const handleError = () => {
      loadMeta();
    };

    const handleOffline = () => {
      setIsOnline(false);
      loadMeta();
    };

    const handleOnline = () => {
      setIsOnline(true);
      loadMeta();
    };

    window.addEventListener("mara_sync_completed", handleCompleted);
    window.addEventListener("mara_sync_error", handleError);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("mara_sync_completed", handleCompleted);
      window.removeEventListener("mara_sync_error", handleError);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) return;
    setRetrying(true);
    await syncOfflineData(user?.sede_id);
    setRetrying(false);
    loadMeta();
  };

  // Renderizado según estado
  const isSyncing = meta?.status === "in_progress" || retrying;
  const isError = meta?.status === "error";

  let chipContent = null;

  if (!isOnline) {
    chipContent = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        📴 Sin conexión · datos de {formatRelativeTime(meta?.last_synced_at)}
      </span>
    );
  } else if (isSyncing) {
    chipContent = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-[11px] font-semibold animate-pulse">
        <span className="w-2.5 h-2.5 rounded-full border-2 border-cyan-600 border-t-transparent animate-spin" />
        Sincronizando…
      </span>
    );
  } else if (isError) {
    chipContent = (
      <button
        type="button"
        onClick={() => setShowDiagModal(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        ⚠ Error al sincronizar
      </button>
    );
  } else {
    chipContent = (
      <button
        type="button"
        onClick={handleManualSync}
        title="Click para re-sincronizar datos"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        ✔ Sincronizado · {formatRelativeTime(meta?.last_synced_at)}
      </button>
    );
  }

  return (
    <>
      <div className="hidden sm:flex items-center">{chipContent}</div>

      {showDiagModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-[14px]">
                <Icon name="warning" size={18} />
                Diagnóstico de Sincronización
              </div>
              <button
                type="button"
                onClick={() => setShowDiagModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-[12.5px] text-slate-700">
              <div>
                <span className="font-semibold text-slate-500 block text-[11px] uppercase tracking-wide">
                  Paso donde ocurrió el fallo:
                </span>
                <code className="text-amber-800 font-mono text-[11.5px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block mt-0.5">
                  {meta?.step || "No especificado"}
                </code>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block text-[11px] uppercase tracking-wide">
                  Mensaje técnico del servidor:
                </span>
                <p className="mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono text-[11px] break-words">
                  {meta?.error || "Error de red o timeout en la conexión a Supabase"}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block text-[11px] uppercase tracking-wide">
                  Última sincronización registrada:
                </span>
                <span className="text-slate-700 font-medium">
                  {meta?.last_synced_at
                    ? new Date(meta.last_synced_at).toLocaleString("es-PE")
                    : "Ninguna"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDiagModal(false)}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-[12.5px] font-semibold transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={retrying}
                onClick={async () => {
                  setRetrying(true);
                  await syncOfflineData(user?.sede_id);
                  setRetrying(false);
                  loadMeta();
                  setShowDiagModal(false);
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[12.5px] font-semibold transition-colors flex items-center gap-1.5"
              >
                {retrying ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Reintentando…
                  </>
                ) : (
                  <>
                    <Icon name="refresh" size={14} />
                    Reintentar sincronización
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
