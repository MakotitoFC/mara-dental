import { createClient } from "@/lib/supabase/server";
import { getPersonalAction, getFiltrosPersonalAction, getAllSedesAction } from "./personal.actions";
import PersonalClient from "./PersonalClient";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";

export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("usuarios")
    .select("rol(rol), sede_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/dashboard");
  }

  const rolRaw = profile.rol as any;
  const rol = Array.isArray(rolRaw) ? rolRaw[0] : rolRaw;
  const userRole = rol?.rol;
  if (userRole !== "admin" && userRole !== "superadmin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = parseInt((params.page as string) || "1", 10);
  const search = (params.search as string) || "";
  const especialidadId = params.especialidadId ? parseInt(params.especialidadId as string, 10) : null;
  const puestoId = params.puestoId ? parseInt(params.puestoId as string, 10) : null;
  const rolId = params.rolId ? parseInt(params.rolId as string, 10) : null;
  const sedeId = params.sedeId ? parseInt(params.sedeId as string, 10) : profile.sede_id;

  const { data, count, totalPages } = await getPersonalAction({
    page,
    limit: 5,
    search,
    especialidadId,
    puestoId,
    sedeId,
    rolId,
  });

  const { especialidades, puestos, roles } = await getFiltrosPersonalAction();
  
  let sedes: any[] = [];
  if (userRole === "superadmin") {
    sedes = await getAllSedesAction();
  }

  return (
    <>
      <Header title="Personal" />
      <PersonalClient
        initialData={data}
        initialCount={count}
        totalPages={totalPages}
        currentPage={page}
        especialidades={especialidades}
        puestos={puestos}
        sedes={sedes}
        roles={roles}
        userRole={userRole}
        userSedeId={profile.sede_id}
      />
    </>
  );
}
