"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import { headers, cookies } from "next/headers";

export async function loginAction(formData: FormData){
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = await createClient();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";

    // 1. Obtener usuario_id desde la tabla personal para registrar sesión en caso de fallo
    const { data: personalData } = await supabase
        .from("personal")
        .select("usuario_id")
        .eq("email", email)
        .single();
    
    const usuarioId = personalData?.usuario_id;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if(error){
        if (usuarioId) {
            await supabase.rpc("registrar_sesion", {
                p_usuario_id: usuarioId,
                p_ip: ip,
                p_user_agent: "Fallo: Credenciales incorrectas o usuario inactivo"
            });
        }
        return { error: "Credenciales incorrectas o usuario no encontrado." };
    }

    const actualUserId = data.user.id;

    // 2. Buscar rol y estado activo del usuario
    const { data: usuario } = await supabase
      .from("usuarios")
      .select(`
        activo,
        rol:rol_id (rol)
      `)
      .eq("id", actualUserId)
      .single();

    if (usuario && usuario.activo === false) {
      await supabase.auth.signOut();
      await supabase.rpc("registrar_sesion", {
        p_usuario_id: actualUserId,
        p_ip: ip,
        p_user_agent: "Fallo: Intento de inicio de sesión en cuenta desactivada por administrador"
      });
      return { error: "Tu cuenta ha sido desactivada. Por favor, comunícate con el administrador de la clínica." };
    }

    // @ts-ignore
    const roleName = (usuario?.rol?.rol || "").toLowerCase();

    if (!roleName) {
        // Bloquear acceso si no tiene rol definido
        await supabase.auth.signOut();
        const { data: sesionId } = await supabase.rpc("registrar_sesion", {
            p_usuario_id: actualUserId,
            p_ip: ip,
            p_user_agent: "Fallo: Rol no asignado o usuario sin permisos"
        });
        
        if (sesionId) {
            await supabase.rpc("cerrar_sesion", {
                p_sesion_id: sesionId,
                p_voluntario: false
            });
        }
        
        return { error: "Hubo un problema con su autenticación, comuniquese con el administrador" };
    }

    // Registrar sesión exitosa
    const { data: sesionId } = await supabase.rpc("registrar_sesion", {
        p_usuario_id: actualUserId,
        p_ip: ip,
        p_user_agent: `Éxito: Login exitoso como ${roleName}`
    });

    if (sesionId) {
        const cookieStore = await cookies();
        cookieStore.set("mara_sesion_id", sesionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 7 días
            path: "/"
        });
    }

    if (roleName === "administrador" || roleName === "admin" || roleName === "superadmin") {
        redirect("/admin/dashboard");
    } else if (roleName === "contador") {
        redirect("/contador-dashboard");
    } else {
        redirect("/dashboard");
    }
}

export async function resetPasswordAction(formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const proto = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : "http://localhost:3000");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/actualizar-password`,
  });

  if (error) {
    return { error: error.message || "No se pudo enviar el correo de recuperación." };
  }

  return { success: "Te hemos enviado un correo con instrucciones para restablecer tu contraseña." };
}

export async function verifyRecoveryOtpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const token = ((formData.get("token") as string) || "").trim();
  const supabase = await createClient();

  if (!email || !token) {
    return { error: "Por favor ingresa tu correo y el código de verificación." };
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });

  if (error) {
    return { error: "Código incorrecto o expirado. Por favor verifica e intenta nuevamente." };
  }

  return { success: true };
}

export async function updatePasswordAction(formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (!/[a-z]/.test(password)) {
    return { error: "La contraseña debe incluir al menos una letra minúscula (a-z)." };
  }
  if (!/[A-Z]/.test(password)) {
    return { error: "La contraseña debe incluir al menos una letra mayúscula (A-Z)." };
  }
  if (!/[0-9]/.test(password)) {
    return { error: "La contraseña debe incluir al menos un número (0-9)." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { error: "La contraseña debe incluir al menos un símbolo o carácter especial (!@#$%...)." };
  }
  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden. Por favor verifícalas." };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "La sesión ha expirado o no es válida. Por favor solicita un nuevo código de recuperación." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message || "No se pudo actualizar la contraseña." };
  }

  return { success: true };
}

export async function logoutAction() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const sesionId = cookieStore.get("mara_sesion_id")?.value;

  if (sesionId) {
      await supabase.rpc("cerrar_sesion", {
          p_sesion_id: sesionId,
          p_voluntario: true
      });
      cookieStore.delete("mara_sesion_id");
  }

  await supabase.auth.signOut(); // Esto borra las cookies seguras en el servidor
  redirect('/login');
}