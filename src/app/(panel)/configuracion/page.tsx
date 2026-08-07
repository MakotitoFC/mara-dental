import { Header } from "@/components/layout/Header";
import { getPerfilProfesionalAction, getHorariosAction } from "./actions";
import { ConfiguracionView } from "./components/ConfiguracionView";

export default async function ConfiguracionPage() {
  const [perfil, horarios] = await Promise.all([
    getPerfilProfesionalAction(),
    getHorariosAction(),
  ]);

  return (
    <>
      <Header title="Configuración" />
      <div className="flex-1 overflow-y-auto">
        <ConfiguracionView perfil={perfil} horarios={horarios} />
      </div>
    </>
  );
}
