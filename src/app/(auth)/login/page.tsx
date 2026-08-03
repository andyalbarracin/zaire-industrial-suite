"use client";
// page.tsx — src/app/(auth)/login/page.tsx — 2026-08-02
// Login split-screen 60/40: panel con imagen de fondo + slider de la suite (izq) + formulario (der)

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ArrowRight,
  Layers,
  ClipboardList,
  Cog,
  Briefcase,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Slides del panel izquierdo ─────────────────────────────────────────────
// Editables acá. Slide 1 = la suite completa; los siguientes, ~2 módulos por slide.
// Textos tomados de los brochures (.docs/brochures). Prevent va como "en camino".
const SLIDES = [
  {
    icon: Layers,
    tag: "Plataforma modular",
    title: "Una plataforma, muchas capacidades",
    body: "Zaire Industrial es software modular, argentino. Se contrata por módulo: arrancás por el dolor que más te duele hoy, y cada capacidad que sumás potencia a las que ya tenés — con tu marca y en tu propia base.",
    accent: "#576CBC",
    bullets: ["Órdenes y trazabilidad", "Campo, ventas, stock y equipos", "Todo con tu marca", "Registros auditables"],
  },
  {
    icon: ClipboardList,
    tag: "Órdenes + Campo",
    title: "Del taller a la calle, sin papeles",
    body: "Zaire Trace convierte cada trabajo en una orden numerada y trazable, con PDFs e historial que resiste una auditoría. Zaire Field lleva a tus técnicos al sitio con prueba de asistencia por GPS, reportes con fotos y viáticos con aprobación.",
    accent: "#A5D7E8",
    bullets: ["Órdenes numeradas OT/OTS", "Historial y estados por ítem", "GPS y prueba de asistencia", "Reportes con fotos y gastos"],
  },
  {
    icon: Cog,
    tag: "Equipos + Inventario",
    title: "Tus equipos y tu stock, bajo control",
    body: "Zaire Assets le da a cada equipo su gemelo digital: salud, costo real (TCO) y confiabilidad. Zaire Stock te da el inventario en tiempo real, valuado a costo real, que se descuenta solo cuando lo usás.",
    accent: "#576CBC",
    bullets: ["Salud y costo por equipo", "Confiabilidad (MTBF)", "Inventario valuado (WAC)", "Alertas de reposición"],
  },
  {
    icon: Briefcase,
    tag: "Ventas + lo que viene",
    title: "Vendé con la rentabilidad a la vista",
    body: "Zaire CRM ordena tu proceso comercial: embudo de ventas y cotizaciones con el margen calculado en vivo. Y en camino, Zaire Prevent: mantenimiento preventivo que genera las visitas y las órdenes de forma automática.",
    accent: "#A5D7E8",
    bullets: ["Pipeline visual", "Cotizaciones con margen", "Score de cuentas", "Preventivo · en camino"],
  },
] as const;

// ─── Schemas ─────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const registerSchema = z
  .object({
    fullName: z.string().min(2, "El nombre es obligatorio"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

// ─── Componente ──────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [isRegister, setIsRegister] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-advance slides
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 9000);
    return () => clearInterval(t);
  }, []);

  // Login form
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Register form
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  async function handleLogin(data: LoginForm) {
    setAuthError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      // Mostrar el error REAL de Supabase para debug
      setAuthError(`[${error.status}] ${error.message}`);
      return;
    }
    router.push(ROUTES.home);
    router.refresh();
  }

  async function handleRegister(data: RegisterForm) {
    setAuthError(null);
    setSuccessMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName } },
    });
    if (error) {
      setAuthError(error.message);
      return;
    }
    setSuccessMsg("¡Cuenta creada! Revisá tu email para confirmar el registro.");
    registerForm.reset();
  }

  const prevSlide = () => setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length);
  const nextSlide = () => setSlide((s) => (s + 1) % SLIDES.length);
  const currentSlide = SLIDES[slide];
  const SlideIcon = currentSlide.icon;

  return (
    <div className="flex min-h-screen w-full overflow-hidden">

      {/* ── Panel izquierdo 60% — Imagen de fondo + slider ─────────────── */}
      <div
        className="hidden lg:flex lg:w-[60%] relative flex-col justify-between p-12"
        style={{ minHeight: "100vh", backgroundColor: "#0B2447" }}
      >
        {/* Imagen de fondo — reemplazá /public/login-bg.jpg para cambiarla */}
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        {/* 2 capas de gradiente oscuro para legibilidad del texto */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(6,10,24,0.35) 0%, rgba(6,10,24,0.12) 35%, rgba(6,10,24,0.92) 100%)" }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to right, rgba(6,10,24,0.10) 0%, rgba(6,10,24,0.50) 100%)" }}
        />

        {/* Logo de Zaire — branding fijo del login. Reemplazá el archivo /public/branding/logo-white.svg para cambiar el logo. */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/logo-white.svg" alt="Zaire" className="w-full h-full object-contain" />
          </div>
          <div>
            {/* Título y subtítulo del branding del login (fijos) */}
            <span className="text-white font-bold text-xl tracking-tight">Zaire</span>
            <span className="block text-white/55 text-xs">Industrial Suite</span>
          </div>
        </div>

        {/* Slide content */}
        <div className="relative z-10 space-y-8 flex-1 flex flex-col justify-center py-16">
          {/* Tag */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-fit transition-colors duration-500"
            style={{ backgroundColor: `${currentSlide.accent}25`, color: currentSlide.accent, border: `1px solid ${currentSlide.accent}40` }}
          >
            <SlideIcon className="w-3.5 h-3.5" />
            {currentSlide.tag}
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              {currentSlide.title}
            </h2>
            {/* Body de los módulos. Legibilidad sobre la imagen de fondo: subí la opacidad
                (text-white/85 → /90) si la zona oscura del fondo dificulta la lectura. */}
            <p className="text-white/85 text-lg leading-relaxed max-w-lg">
              {currentSlide.body}
            </p>
          </div>

          {/* Feature bullets — por slide (text-white/70 para que se lean sobre el fondo) */}
          <div className="grid grid-cols-2 gap-3 max-w-lg">
            {currentSlide.bullets.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-white/70">
                <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: currentSlide.accent }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Slide controls */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === slide ? "32px" : "8px",
                  backgroundColor: i === slide ? currentSlide.accent : "rgba(255,255,255,0.25)",
                }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevSlide}
              className="w-9 h-9 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              className="w-9 h-9 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Panel derecho 40% — Formulario ─────────────────────────────── */}
      <div className="flex-1 lg:w-[40%] flex flex-col min-h-screen bg-[#F7F7F7]">
        {/* Mobile logo — Zaire (mismo archivo: /public/branding/logo-white.svg) */}
        <div className="lg:hidden flex items-center gap-2 p-6 border-b border-gray-200 bg-zaire-navy">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/logo-white.svg" alt="Zaire" className="w-5 h-5 object-contain" />
          <span className="text-white font-bold">Zaire</span>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 xl:px-14">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {isRegister ? "Crear cuenta" : "Bienvenido"}
            </h1>
            <p className="text-sm text-gray-500">
              {isRegister
                ? "Completá tus datos para registrarte"
                : "Ingresá a tu cuenta de Zaire"}
            </p>
          </div>

          {/* ── LOGIN FORM ── */}
          {!isRegister && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-gray-700 font-medium text-sm">
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  autoComplete="email"
                  className="h-11 bg-white border-gray-200 focus:border-zaire-blue focus:ring-zaire-blue/20 text-gray-900"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-red-500">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-gray-700 font-medium text-sm">
                    Contraseña
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-11 bg-white border-gray-200 pr-10 focus:border-zaire-blue focus:ring-zaire-blue/20 text-gray-900"
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-red-500">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {authError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loginForm.formState.isSubmitting}
                className="w-full h-11 bg-zaire-navy hover:bg-zaire-navy-mid text-white font-semibold transition-colors"
              >
                {loginForm.formState.isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ingresando...</>
                ) : (
                  "Ingresar"
                )}
              </Button>

              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">¿No tenés cuenta?</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsRegister(true); setAuthError(null); loginForm.reset(); }}
                className="w-full h-11 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-medium"
              >
                Registrarse
              </Button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {isRegister && (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 font-medium text-sm">Nombre completo</Label>
                <Input
                  type="text"
                  placeholder="Juan Pérez"
                  className="h-11 bg-white border-gray-200 text-gray-900"
                  {...registerForm.register("fullName")}
                />
                {registerForm.formState.errors.fullName && (
                  <p className="text-xs text-red-500">{registerForm.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-700 font-medium text-sm">Email</Label>
                <Input
                  type="email"
                  placeholder="usuario@empresa.com"
                  className="h-11 bg-white border-gray-200 text-gray-900"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-red-500">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-700 font-medium text-sm">Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    className="h-11 bg-white border-gray-200 pr-10 text-gray-900"
                    {...registerForm.register("password")}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-red-500">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-700 font-medium text-sm">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repetí tu contraseña"
                    className="h-11 bg-white border-gray-200 pr-10 text-gray-900"
                    {...registerForm.register("confirmPassword")}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Aceptar términos */}
              <p className="text-xs text-gray-500 leading-relaxed">
                Al registrarte aceptás nuestros{" "}
                <Link href={ROUTES.terminos} target="_blank" className="text-zaire-blue underline hover:text-zaire-navy">
                  Términos y Condiciones
                </Link>{" "}
                y la{" "}
                <Link href={`${ROUTES.terminos}#privacidad`} target="_blank" className="text-zaire-blue underline hover:text-zaire-navy">
                  Política de Privacidad
                </Link>.
              </p>

              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{authError}</div>
              )}
              {successMsg && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">{successMsg}</div>
              )}

              <Button
                type="submit"
                disabled={registerForm.formState.isSubmitting}
                className="w-full h-11 bg-zaire-navy hover:bg-zaire-navy-mid text-white font-semibold"
              >
                {registerForm.formState.isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando cuenta...</>
                ) : (
                  "Crear cuenta"
                )}
              </Button>

              <Button type="button" variant="ghost"
                onClick={() => { setIsRegister(false); setAuthError(null); setSuccessMsg(null); registerForm.reset(); }}
                className="w-full text-gray-500 hover:text-gray-700"
              >
                ← Volver al inicio de sesión
              </Button>
            </form>
          )}
        </div>

        {/* Footer con links legales */}
        <div className="px-8 xl:px-14 py-6 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            © 2026 Zaire ·{" "}
            <Link href={ROUTES.terminos} className="hover:text-gray-600 underline underline-offset-2">
              Términos y Condiciones
            </Link>
            {" · "}
            <Link href={`${ROUTES.terminos}#privacidad`} className="hover:text-gray-600 underline underline-offset-2">
              Política de Privacidad
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
