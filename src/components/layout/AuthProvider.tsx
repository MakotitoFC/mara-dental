"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logoutAction } from "@/app/login/actions";
import { AuthUser } from "@/types/auth";

interface AuthCtxValue {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthCtxValue>({
  user: null,
  loading: false,//No empezamos cargando
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children, initialUser }: { children: ReactNode, initialUser:AuthUser|null}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(false);//No empezamos cargando

  useEffect(() => {
    const supabase = createClient();

    // Solo escuchamos eventos en vivo (ej. si el token expira o hace logout)
    const {data:listener} = supabase.auth.onAuthStateChange(async (event)=>{
      if(event==="SIGNED_OUT"){
        setUser(null);
        router.push("/login");
      }else if(event==="TOKEN_REFRESHED" || event==="SIGNED_IN"){
        // En lugar de confiar en la 'session' del navegador, le preguntamos al servidor de Supabase
        const {data:{user:realUser}} = await supabase.auth.getUser();
        if(!realUser){
          setUser(null);
          router.push("/login");
        }
        
      }
    });

    return ()=>{listener.subscription.unsubscribe();};
  }, [router]);

  async function logout() {
    await logoutAction();
  }

  return (
    <AuthCtx.Provider value={{ user, loading, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

