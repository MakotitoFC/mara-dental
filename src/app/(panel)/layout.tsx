// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server'; // o donde tengas tu cliente servidor
import {DashboardShell} from '@/components/layout/DashboardShell';
import { AuthUser } from '@/types/auth';
import { TipoConsultaProvider, TipoConsulta } from '@/providers/TipoConsultaProvider';


function getInitials(name:string){
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Solo el primer nombre y el primer apellido — nombre/apellido en BD pueden traer varias palabras (ej. "Juan Carlos", "Pérez García"). */
function primeraPalabra(s?: string | null): string {
  return (s ?? "").trim().split(/\s+/)[0] ?? "";
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient(); // instanciar cliente
  let currentUser: AuthUser | null = null;
  let tiposConsulta: TipoConsulta[] = [];
  
  const {data:{user:realUser}} = await supabase.auth.getUser();

  if (!realUser) {
    redirect('/login');
  }else{
    const userId = realUser.id;
    const email = realUser.email ?? "";
    try {
      const [userRes, personalRes, tiposRes] = await Promise.all([
        supabase.from("usuarios").select(`rol_id, rol (rol), sede (nombre_clinica)`).eq("id",userId).single(),
        supabase.from("personal").select("nombre, apellido, especialidad (especialidad)").eq("usuario_id",userId).single(),
        supabase.from("tipo_consulta").select("id, tipo_consulta, color").order("tipo_consulta", { ascending: true })
      ]);
      
      if (tiposRes.data) tiposConsulta = tiposRes.data as TipoConsulta[];

      const roleName = (userRes.data?.rol as any)?.rol || "Sin rol";
      const sedeNombre = (userRes.data?.sede as any)?.nombre_clinica as string | undefined;
      const especialidadNombre = (personalRes.data?.especialidad as any)?.especialidad as string | undefined;
      const rawName = personalRes.data
        ? `${primeraPalabra(personalRes.data.nombre)} ${primeraPalabra(personalRes.data.apellido)}`.trim()
        : email.split("@")[0];
      const fullName = personalRes.data ? `Dr. ${rawName}` : rawName;

      currentUser = {
        name: fullName,
        email,
        rol: roleName,
        initials: getInitials(rawName),
        especialidad: especialidadNombre,
        sede: sedeNombre,
      };
    } catch (error) {
      console.error("Error cargando perfil en el servidor:", error);
    }
  }

  return (
    <TipoConsultaProvider tipos={tiposConsulta}>
      <DashboardShell initialUser={currentUser}>
          {children}
      </DashboardShell>
    </TipoConsultaProvider>
  );
}