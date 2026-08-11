"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const getAdminClient = () => {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

/** Rol y sede del usuario logueado — el embed `rol(rol)` tipa como array
 * aunque `.single()` garantice una sola fila, así que se desenvuelve igual
 * que en el resto del código (`Array.isArray(x) ? x[0] : x`). */
async function getUsuarioConRol(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("usuarios")
    .select("rol(rol), sede_id")
    .eq("id", userId)
    .single();
  if (!data) return null;
  const rolRaw = data.rol as any;
  const rol = Array.isArray(rolRaw) ? rolRaw[0] : rolRaw;
  return { rol: rol?.rol as string | undefined, sede_id: data.sede_id };
}

export async function getFiltrosPersonalAction() {
  const supabase = await createClient();
  const [{ data: especialidades }, { data: puestos }, { data: roles }] = await Promise.all([
    supabase.from("especialidad").select("id, especialidad"),
    supabase.from("puesto").select("id, puesto"),
    supabase.from("rol").select("id, rol"),
  ]);
  
  return {
    especialidades: especialidades || [],
    puestos: puestos || [],
    roles: roles || [],
  };
}

export async function getPersonalAction({
  page = 1,
  limit = 20,
  search = "",
  especialidadId = null,
  puestoId = null,
  sedeId = null,
  rolId = null,
}: {
  page?: number;
  limit?: number;
  search?: string;
  especialidadId?: number | null;
  puestoId?: number | null;
  sedeId?: number | null; // Solo usado si es superadmin
  rolId?: number | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const currentUserProfile = await getUsuarioConRol(supabase, user.id);
  if (!currentUserProfile) throw new Error("Perfil no encontrado");

  const role = currentUserProfile.rol;
  if (role !== "admin" && role !== "superadmin") {
    throw new Error("No tienes permisos para ver el personal");
  }

  // Filtrado base de sede
  let targetSedeId = sedeId;
  if (role === "admin") {
    targetSedeId = currentUserProfile.sede_id; // Forzado para admin
  } else if (role === "superadmin" && !targetSedeId) {
    targetSedeId = currentUserProfile.sede_id; // Por defecto la suya si no seleccionó
  }

  // Query base
  let query = supabase
    .from("personal")
    .select(`
      usuario_id,
      nombre,
      apellido,
      email,
      fecha_nacimiento,
      telefono,
      num_colegiatura,
      created_at,
      puesto ( id, puesto ),
      especialidad ( id, especialidad ),
      usuarios!inner ( activo, rol_id, sede_id, rol ( rol ) )
    `, { count: "exact" });

  if (targetSedeId) {
    query = query.eq("usuarios.sede_id", targetSedeId);
  }
  
  if (especialidadId) {
    query = query.eq("especialidad_id", especialidadId);
  }

  if (puestoId) {
    query = query.eq("puesto_id", puestoId);
  }

  if (rolId) {
    query = query.eq("usuarios.rol_id", rolId);
  }

  if (search.trim()) {
    const s = `%${search.trim()}%`;
    query = query.or(`nombre.ilike.${s},apellido.ilike.${s}`);
  }

  // Paginación
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to).order("created_at", { ascending: false });

  const { data, count, error } = await query;
  if (error) {
    console.error("Error getPersonalAction:", error);
    throw new Error("Error al obtener el personal");
  }

  return {
    data: data || [],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function createEmpleadoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const currentUserProfile = await getUsuarioConRol(supabase, user.id);
  if (!currentUserProfile) throw new Error("Perfil no encontrado");

  const role = currentUserProfile.rol;
  if (role !== "admin" && role !== "superadmin") throw new Error("Sin permisos");

  const nombre = formData.get("nombre") as string;
  const apellido = formData.get("apellido") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const telefono = formData.get("telefono") as string;
  const fechaNacimiento = formData.get("fecha_nacimiento") as string;
  const numColegiatura = formData.get("num_colegiatura") as string;
  const puestoId = Number(formData.get("puesto_id"));
  const especialidadId = formData.get("especialidad_id") ? Number(formData.get("especialidad_id")) : null;
  const rolId = Number(formData.get("rol_id")); // (1=Doctor, 2=Admin, 3=Superadmin, 4=Asistente)
  
  let targetSedeId = role === "admin" ? currentUserProfile.sede_id : Number(formData.get("sede_id"));

  const adminClient = getAdminClient();

  // 1. Crear Auth User (Bypasses RLS)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error("Auth Error:", authError);
    throw new Error(authError?.message || "Error al crear cuenta de usuario");
  }

  const newUserId = authData.user.id;

  // 2. Insert into usuarios
  const { error: userError } = await adminClient
    .from("usuarios")
    .insert({
      id: newUserId,
      rol_id: rolId,
      activo: true,
      sede_id: targetSedeId,
    });

  if (userError) {
    await adminClient.auth.admin.deleteUser(newUserId);
    throw new Error("Error guardando datos de usuario");
  }

  // 3. Insert into personal
  const { error: personalError } = await adminClient
    .from("personal")
    .insert({
      usuario_id: newUserId,
      nombre,
      apellido,
      email,
      telefono: telefono || null,
      fecha_nacimiento: fechaNacimiento || null,
      num_colegiatura: numColegiatura || null,
      puesto_id: puestoId,
      especialidad_id: especialidadId,
    });

  if (personalError) {
    console.error("Personal Error:", personalError);
    throw new Error("Error guardando datos de personal");
  }

  revalidatePath("/admin/personal");
  return { success: true };
}

export async function editEmpleadoAction(userId: string, formData: FormData) {
  const adminClient = getAdminClient();
  
  const nombre = formData.get("nombre") as string;
  const apellido = formData.get("apellido") as string;
  const telefono = formData.get("telefono") as string;
  const fechaNacimiento = formData.get("fecha_nacimiento") as string;
  const numColegiatura = formData.get("num_colegiatura") as string;
  const puestoId = Number(formData.get("puesto_id"));
  const especialidadId = formData.get("especialidad_id") ? Number(formData.get("especialidad_id")) : null;
  const activo = formData.get("activo") === "true"; // Nuevo campo

  // 1. Actualizar Personal
  const { error } = await adminClient
    .from("personal")
    .update({
      nombre,
      apellido,
      telefono: telefono || null,
      fecha_nacimiento: fechaNacimiento || null,
      num_colegiatura: numColegiatura || null,
      puesto_id: puestoId,
      especialidad_id: especialidadId,
    })
    .eq("usuario_id", userId);

  if (error) throw new Error("Error al actualizar el personal");

  // 2. Actualizar estado activo en Usuarios
  const { error: userError } = await adminClient
    .from("usuarios")
    .update({ activo })
    .eq("id", userId);

  if (userError) throw new Error("Error al actualizar estado del usuario");

  revalidatePath("/admin/personal");
  return { success: true };
}

export async function softDeleteEmpleadoAction(userId: string) {
  const adminClient = getAdminClient();
  const { error } = await adminClient
    .from("usuarios")
    .update({ activo: false })
    .eq("id", userId);

  if (error) throw new Error("Error al eliminar al empleado");
  revalidatePath("/admin/personal");
  return { success: true };
}

export async function getAllSedesAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("sede").select("id, nombre_clinica");
  return data || [];
}
