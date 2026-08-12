import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request:{
    headers:request.headers,
  }, });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresca la sesión del usuario para que no expire
  const {data: {user}} = await supabase.auth.getUser();

  //Saber la ruta en la que estamos
  const pathname = request.nextUrl.pathname;

  if (!user && !pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  const isPublicRoute = pathname.startsWith('/login') || pathname === '/';

  if(user){
    const { data: userData, error } = await supabase.from('usuarios').select('activo, rol_id, rol (rol)').eq('id', user.id).single();

    // EXPULSIÓN INMEDIATA: Si el usuario fue desactivado por un admin/superadmin, cerrar sesión en el servidor y redirigir
    if (!error && userData && userData.activo === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'desactivado');
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.delete(cookie.name);
      });
      return redirectResponse;
    }

    // Evitar que un usuario logueado vea el login
    if(isPublicRoute){
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      const redirectResponse = NextResponse.redirect(url);
      
      // Pasar las cookies renovadas a la redirección
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      
      return redirectResponse;
    }

    if(!error && userData){
      const roleName = (userData.rol as any)?.rol?.toLowerCase();

      if (pathname.startsWith('/dashboard/configuracion') && roleName !== 'administrador') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/acceso-denegado';
        const redirectResponse = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value);
        });
        return redirectResponse;
      }

      const isClinicalRoute = pathname.startsWith('/dashboard/historias') || pathname.startsWith('/dashboard/recetas');
      if (isClinicalRoute && roleName === 'recepcionista') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/citas'; // Lo redirigimos a un lugar donde sí tenga acceso
        const redirectResponse = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value);
        });
        return redirectResponse;
      }
    }
  }
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|__nextjs_font|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)",
  ],
};
