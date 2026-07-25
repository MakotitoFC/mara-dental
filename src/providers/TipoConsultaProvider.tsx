"use client";

import { createContext, useContext, ReactNode } from "react";

export interface TipoConsulta {
  id: string;
  tipo_consulta: string;
  color: string;
}

interface TipoConsultaContextProps {
  tipos: TipoConsulta[];
}

const TipoConsultaContext = createContext<TipoConsultaContextProps | undefined>(undefined);

export function TipoConsultaProvider({ 
  children, 
  tipos 
}: { 
  children: ReactNode; 
  tipos: TipoConsulta[]; 
}) {
  return (
    <TipoConsultaContext.Provider value={{ tipos }}>
      {children}
    </TipoConsultaContext.Provider>
  );
}

export function useTipoConsulta() {
  const context = useContext(TipoConsultaContext);
  if (!context) {
    if (typeof window === "undefined") {
      // Durante SSR a veces Next.js evalúa componentes antes de inyectar el contexto del layout
      return { tipos: [] };
    }
    throw new Error("useTipoConsulta must be used within a TipoConsultaProvider");
  }
  return context;
}

export function useTipoConsultaVars() {
  const { tipos } = useTipoConsulta();

  const getVars = (id: string | null) => {
    const tipo = tipos.find(t => t.id === id);
    const hex = tipo?.color || "#94a3b8"; 
    
    // Convertir hex a variables (15% opacity -> 26)
    const bg = `${hex}26`;
    
    return {
      solid: hex,
      bg: bg,
      text: hex,
      label: tipo?.tipo_consulta || "Desconocido"
    };
  };

  return { getVars, tipos };
}
