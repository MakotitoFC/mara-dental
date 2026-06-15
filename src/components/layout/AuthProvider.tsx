"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface AuthUser {
  name: string;
  email: string;
  rol: string;
  initials: string;
  isMock?: boolean;
}

interface AuthCtxValue {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthCtxValue>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

const MOCK_KEY = "maradental_mock_user";

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Sesión real de Supabase
        const meta = data.user.user_metadata ?? {};
        const name = meta.full_name || meta.name || data.user.email?.split("@")[0] || "Usuario";
        const rol  = meta.rol || meta.role || meta.perfil || "Administrador";
        setUser({ name, email: data.user.email ?? "", rol, initials: getInitials(name) });
        setLoading(false);
        return;
      }

      // Sin sesión real — buscar usuario de prueba en sessionStorage
      try {
        const stored = sessionStorage.getItem(MOCK_KEY);
        if (stored) {
          const mock: AuthUser = JSON.parse(stored);
          setUser(mock);
          setLoading(false);
          return;
        }
      } catch { /* noop */ }

      // Sin sesión ni mock → redirigir al login
      router.push("/login");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(MOCK_KEY);
        setUser(null);
        router.push("/login");
      }
    });

    return () => { listener.subscription.unsubscribe(); };
  }, [router]);

  async function logout() {
    sessionStorage.removeItem(MOCK_KEY);
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthCtx.Provider value={{ user, loading, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

/** Guarda un usuario de prueba en sessionStorage (llamado desde el login) */
export function setMockUser(user: Omit<AuthUser, "initials">) {
  const initials = ((user.name.split(" ")[0]?.[0] ?? "") + (user.name.split(" ")[1]?.[0] ?? "")).toUpperCase() || user.rol.substring(0, 2).toUpperCase();
  sessionStorage.setItem(MOCK_KEY, JSON.stringify({ ...user, initials, isMock: true }));
}
