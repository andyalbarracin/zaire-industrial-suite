// layout.tsx — src/app/layout.tsx — 2026-05-19
// Root layout de Zaire Trace con Inter font y Sonner toaster

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Título + favicon por DEFECTO. Aplican al login y a cualquier página pre-auth, que NO pueden
// leer company_settings (su RLS exige sesión). Dentro de la app, el layout del dashboard
// sobreescribe título y favicon con la identidad del cliente (leída con el cliente autenticado).
// NO existe app/favicon.ico: el favicon se maneja solo por metadata para que el logo del
// cliente no sea pisado por la convención de archivo de Next.
export const metadata: Metadata = {
  title: "Zaire Industrial Suite",
  description: "Suite de gestión industrial",
  icons: { icon: [{ url: "/favicon.ico" }] },
};

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
