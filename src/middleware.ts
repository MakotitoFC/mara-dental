import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
    return NextResponse.redirect(url);
  }

  const isPublicRoute = pathname.startsWith('/login') || pathname === '/';

  if(user){
    //Evitar que un usuario loeguado vea el login
    if(isPublicRoute){
      const url = request.nextUrl.clone();
      console.log(url)
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    const {data:userData,error} = await supabase.from('usuarios').select(`rol_id,rol (rol)`).eq('id',user.id).single();

    if(!error && userData){
      const roleName = (userData.rol as any)?.rol?.toLowerCase();

      if (pathname.startsWith('/dashboard/configuracion') && roleName !== 'administrador') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/acceso-denegado';
        return NextResponse.redirect(url);
      }

      const isClinicalRoute = pathname.startsWith('/dashboard/historias') || pathname.startsWith('/dashboard/recetas');
      if (isClinicalRoute && roleName === 'recepcionista') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/citas'; // Lo redirigimos a un lugar donde sí tenga acceso
        return NextResponse.redirect(url);
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
