// proxy.ts — src/proxy.ts — 2026-05-20
// Next.js 16 proxy (ex-middleware) para protección de rutas y refresco de sesión Supabase
// NOTA: En Next.js 16 el archivo se llama proxy.ts y la función exportada "proxy"

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/lib/routes";
import { getEnabledModules } from "@/lib/modules";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/terminos") ||
    pathname.startsWith("/auth");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.home; // la raíz redirige al primer módulo habilitado (module-aware)
    return NextResponse.redirect(url);
  }

  // Guard de módulo: si el usuario entra por URL a un módulo deshabilitado, a la raíz.
  if (user) {
    const enabled = getEnabledModules();
    if (
      (pathname.startsWith("/trace") && !enabled.includes("trace")) ||
      (pathname.startsWith("/field") && !enabled.includes("field")) ||
      (pathname.startsWith("/crm") && !enabled.includes("crm")) ||
      (pathname.startsWith("/stock") && !enabled.includes("stock")) ||
      (pathname.startsWith("/assets") && !enabled.includes("assets"))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.home;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
