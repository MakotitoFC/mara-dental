// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server'; // o donde tengas tu cliente servidor
import {DashboardShell} from '@/components/layout/DashboardShell';
import { AuthUser } from '@/types/auth';


function getInitials(name:string){
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient(); // instanciar cliente
  let currentUser: AuthUser | null = null;
  const {data:{user:realUser}} = await supabase.auth.getUser();

  if (!realUser) {
    redirect('/login');
  }else{
    const userId = realUser.id;
    const email = realUser.email ?? "";
    try {
      const [userRes,personalRes] = await Promise.all([
        supabase.from("usuarios").select(`rol_id, rol (rol), sede (nombre_clinica)`).eq("id",userId).single(),
        supabase.from("personal").select("nombre, apellido, especialidad (especialidad)").eq("usuario_id",userId).single()
      ]);

      const roleName = (userRes.data?.rol as any)?.rol || "Sin rol";
      const sedeNombre = (userRes.data?.sede as any)?.nombre_clinica as string | undefined;
      const especialidadNombre = (personalRes.data?.especialidad as any)?.especialidad as string | undefined;
      const rawName = personalRes.data ? `${personalRes.data.nombre} ${personalRes.data.apellido}` : email.split("@")[0];
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
    <DashboardShell initialUser={currentUser}>
        {children}
    </DashboardShell>
  );
}