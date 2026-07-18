"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData){
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if(error){
        return { error: "Credenciales incorrectas o usuario no encontrado." };
    }

    // Buscar rol del usuario para redirección
    const { data: usuario } = await supabase
      .from("usuarios")
      .select(`
        rol:rol_id (rol)
      `)
      .eq("id", data.user.id)
      .single();

    // @ts-ignore
    const roleName = (usuario?.rol?.rol || "").toLowerCase();

    if (roleName === "administrador" || roleName === "admin") {
        redirect("/admin/dashboard");
    } else {
        redirect("/dashboard");
    }
}

export async function resetPasswordAction(formData: FormData){
    const email = formData.get("email") as string;
    const supabase = await createClient();

    const {error} = await supabase.auth.resetPasswordForEmail(email,{
        redirectTo:`${process.env.NEXT_PUBLIC_SITE_URL}/actualizar-password`,
    });

    if(error) return {error:"No se pudo enviar el correo de recuperación."};

    return {success:"Te hemos enviado un enlace para recuperar tu contraseña."}
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut(); // Esto borra las cookies seguras en el servidor
  redirect('/login');
}