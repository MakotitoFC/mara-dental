import { 
  getTiposConsultaAction, 
  getTiposArchivoAction, 
  getCondicionAction 
} from "./actions";
import { 
  getCie10Action,
  getRolesAdminAction,
  getPuestosAdminAction,
  getEspecialidadesAdminAction
} from "../admin.actions";
import ConfiguracionTiposClient from "./ConfiguracionTiposClient";
import { Header } from "@/components/layout/Header";

export default async function ConfiguracionTiposPage() {
  const [cData, aData, condData, cieData, rolesData, puestosData, especialidadesData] = await Promise.all([
    getTiposConsultaAction(), 
    getTiposArchivoAction(), 
    getCondicionAction(),
    getCie10Action(),
    getRolesAdminAction(),
    getPuestosAdminAction(),
    getEspecialidadesAdminAction()
  ]);

  return (
    <>
      <Header title="Config. Tipos" />
      <ConfiguracionTiposClient
        initialConsultas={cData}
        initialArchivos={aData}
        initialCondiciones={condData}
        initialCie10={cieData}
        initialRoles={rolesData}
        initialPuestos={puestosData}
        initialEspecialidades={especialidadesData}
      />
    </>
  );
}
