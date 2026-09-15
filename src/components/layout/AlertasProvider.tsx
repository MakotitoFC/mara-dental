"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { 
  getAlertasAction, 
  markNotificacionLeidaAction, 
  markMessagesAsReadForPacienteAction,
  type AlertasData 
} from "./alertas.actions";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

const DISMISSED_KEY = "maradental:alertas-dismissed";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
    // Filtrar cualquier key de mensajes de chat antiguos para que nunca queden silenciados
    const cleaned = (Array.isArray(raw) ? raw : []).filter((k: string) => !k.startsWith("msg-"));
    return new Set(cleaned);
  } catch {
    return new Set();
  }
}

function writeDismissed(set: Set<string>) {
  if (typeof window === "undefined") return;
  const list = [...set].filter((k) => !k.startsWith("msg-"));
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
}

interface AlertasContextType {
  data: AlertasData | null;
  loading: boolean;
  dismissed: Set<string>;
  dismiss: (key: string) => void;
  dismissAll: (keys?: string[]) => void;
  refetch: () => Promise<void>;
}

const AlertasContext = createContext<AlertasContextType | null>(null);

export function AlertasProvider({ 
  children,
  initialAccessToken 
}: { 
  children: ReactNode;
  initialAccessToken?: string | null;
}) {
  const toast = useToast();
  const [data, setData] = useState<AlertasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const prevDataRef = useRef<AlertasData | null>(null);

  const fetchAlertas = useCallback(async (isInitial: boolean = false) => {
    try {
      let res: AlertasData;
      try {
        const apiRes = await fetch("/api/alertas", { cache: "no-store" });
        if (apiRes.ok) {
          res = await apiRes.json();
        } else {
          res = await getAlertasAction();
        }
      } catch {
        res = await getAlertasAction();
      }

      setData(res);
      setLoading(false);

      if (!isInitial && prevDataRef.current) {
        const prev = prevDataRef.current;
        const prevMsgByPaciente = new Map((prev.mensajesNoLeidos || []).map((m) => [m.pacienteId, m.cantidad]));

        for (const m of res.mensajesNoLeidos || []) {
          const prevCantidad = prevMsgByPaciente.get(m.pacienteId) ?? 0;
          if (m.cantidad > prevCantidad) {
            const diff = m.cantidad - prevCantidad;
            toast.info(`${diff} mensaje${diff > 1 ? "s" : ""} nuevo${diff > 1 ? "s" : ""} por Telegram`, {
              title: m.pacienteNombre,
            });
          }
        }

        const prevNotifIds = new Set((prev.notificacionesSistema || []).map((n) => n.id));
        for (const n of res.notificacionesSistema || []) {
          if (!prevNotifIds.has(n.id)) {
            toast.info(n.mensaje, { title: n.titulo });
          }
        }
      }

      prevDataRef.current = res;
    } catch (err) {
      console.error("[AlertasProvider] Error fetching alertas:", err);
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setDismissed(readDismissed());

    // Carga inicial
    fetchAlertas(true);

    let active = true;
    let channel: any = null;
    const supabase = createClient();

    async function initRealtime() {
      try {
        // Obtener la sesión activa para extraer el JWT
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || initialAccessToken;

        if (!active) return;

        if (token) {
          console.log("[AlertasProvider] Autenticando Realtime...");
          await supabase.realtime.setAuth(token);
        } else {
          console.warn("[AlertasProvider] No se encontró token para Realtime");
        }

        if (!active) return;

        // Limpiar canal previo si existía
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
        }

        const channelName = `global_alerts_${Date.now()}`;
        console.log(`[AlertasProvider] Conectando canal Realtime: ${channelName}`);
        const newChannel = supabase.channel(channelName);

        newChannel
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
            console.log("[AlertasProvider] Nuevo mensaje recibido por Realtime:", payload);
            fetchAlertas(false);
          })
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload: any) => {
            console.log("[AlertasProvider] Mensaje actualizado recibido por Realtime:", payload);
            fetchAlertas(false);
          })
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pacientes" }, () => {
            fetchAlertas(false);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "notificaciones" }, () => {
            fetchAlertas(false);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "solicitud_validacion" }, () => {
            fetchAlertas(false);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "mensajes_telegram" }, () => {
            fetchAlertas(false);
          })
          .on("broadcast", { event: "NEW_NOTIFICACION" }, () => {
            fetchAlertas(false);
          })
          .on("broadcast", { event: "NEW_VALIDACION" }, () => {
            fetchAlertas(false);
          })
          .subscribe((status: string, err?: any) => {
            console.log(`[AlertasProvider] Realtime status: ${status}`, err || "");
          });

        channel = newChannel;
      } catch (err) {
        console.error("[AlertasProvider] Error iniciando Realtime:", err);
      }
    }

    initRealtime();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchAlertas, initialAccessToken]);

  const dismiss = useCallback((key: string) => {
    if (key.startsWith("notif:")) {
      markNotificacionLeidaAction(key.replace("notif:", "")).catch(console.error);
    }
    if (key.startsWith("msg-")) {
      const parts = key.split("-");
      if (parts.length >= 6) {
        const pacienteId = parts.slice(1, 6).join("-");
        markMessagesAsReadForPacienteAction(pacienteId).catch(console.error);
      }
    }
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      writeDismissed(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback((keys?: string[]) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      const toAdd = keys || [];
      toAdd.forEach((k) => {
        if (k.startsWith("notif:")) {
          markNotificacionLeidaAction(k.replace("notif:", "")).catch(console.error);
        }
        if (k.startsWith("msg-")) {
          const parts = k.split("-");
          if (parts.length >= 6) {
            const pacienteId = parts.slice(1, 6).join("-");
            markMessagesAsReadForPacienteAction(pacienteId).catch(console.error);
          }
        }
        next.add(k);
      });
      writeDismissed(next);
      return next;
    });
  }, []);

  const refetch = useCallback(async () => {
    await fetchAlertas(false);
  }, [fetchAlertas]);

  return (
    <AlertasContext.Provider value={{ data, loading, dismissed, dismiss, dismissAll, refetch }}>
      {children}
    </AlertasContext.Provider>
  );
}

export function useAlertas() {
  const ctx = useContext(AlertasContext);
  if (!ctx) {
    throw new Error("useAlertas debe usarse dentro de un AlertasProvider");
  }
  return ctx;
}
