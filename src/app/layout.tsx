// layout.tsx — src/app/layout.tsx — 2026-05-19
// Root layout de Zaire Trace con Inter font y Sonner toaster

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { createServiceClient } from "@/lib/supabase/service";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Tipo MIME del favicon según la extensión del archivo (soporta svg/png/webp/jpg/ico).
function faviconType(url: string): string | undefined {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".svg")) return "image/svg+xml";
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
  if (clean.endsWith(".ico")) return "image/x-icon";
  return undefined;
}

// Favicon dinámico: usa el mismo logo que el cliente sube en Preferencias
// (company_settings.app_logo_url, el del sidebar). Si no hay o la tabla no responde,
// cae al favicon de Zaire por defecto en /public/favicon.ico. Nunca deja la app sin ícono.
// Importante: el favicon se maneja SOLO por metadata; NO existe app/favicon.ico, porque esa
// convención de archivo de Next pisaría el favicon dinámico del cliente.
export async function generateMetadata(): Promise<Metadata> {
  let iconUrl = "/favicon.ico"; // fallback estático servido desde /public
  try {
    const sb = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any)
      .from("company_settings")
      .select("app_logo_url")
      .eq("id", 1)
      .single();
    if (data?.app_logo_url) iconUrl = data.app_logo_url as string;
  } catch {
    // Sin acceso → se mantiene el favicon por defecto.
  }
  const type = faviconType(iconUrl);
  return {
    // Título por defecto (login y páginas sin título propio). Dentro de la app, el layout
    // del dashboard lo sobreescribe con el nombre del cliente.
    title: "Zaire Industrial Suite",
    description: "Suite de gestión industrial",
    icons: { icon: type ? [{ url: iconUrl, type }] : [{ url: iconUrl }] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="azul" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <head>
        {/* No-flash: aplica tema/modo guardados ANTES del primer paint (evita parpadeo). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('zaire-theme');var m=localStorage.getItem('zaire-mode');var d=document.documentElement;if(t==='bronze'||t==='azul'||t==='bordo')d.setAttribute('data-theme',t);var dark=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.classList.toggle('dark',dark);}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full bg-zaire-bg">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
