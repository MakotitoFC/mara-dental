import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { getPerfilProfesionalAction, getHorariosAction, getHorariosSedeAction } from "./actions";
import { ConfiguracionView } from "./components/ConfiguracionView";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let rol = "";
  if (user) {
    const { data: usr } = await supabase.from("usuarios").select("rol ( rol )").eq("id", user.id).single();
    rol = (usr?.rol as any)?.rol ?? "";
  }

  const perfil = await getPerfilProfesionalAction();

  if (rol === "asistente") {
    const horariosSede = await getHorariosSedeAction();
    return (
      <>
        <Header title="Configuración" />
        <div className="flex-1 overflow-y-auto">
          <ConfiguracionView perfil={perfil} rol={rol} horariosSede={horariosSede} />
        </div>
      </>
    );
  }

  const horarios = await getHorariosAction();

  return (
    <>
      <Header title="Configuración" />
      <div className="flex-1 overflow-y-auto">
        <ConfiguracionView perfil={perfil} rol={rol} horarios={horarios} />
      </div>
    </>
  );
}
