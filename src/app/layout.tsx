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

export const metadata: Metadata = {
  title: "Zaire Trace — Sistema de Trazabilidad",
  description: "Gestión y trazabilidad de órdenes de trabajo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-zaire-bg">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
