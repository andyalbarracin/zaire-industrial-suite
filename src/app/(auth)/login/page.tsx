"use client";
// page.tsx — src/app/(auth)/login/page.tsx — 2026-05-20
// Login split-screen 60/40: slider industrial izquierda + formulario derecha

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import {
  Activity,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  BarChart3,
  FileDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Slides del panel izquierdo ─────────────────────────────────────────────
const SLIDES = [
  {
    icon: ClipboardList,
    tag: "Trazabilidad completa",
    title: "Cada orden, bajo control",
    body: "Registrá, numerá y seguí todas tus órdenes de trabajo desde el ingreso hasta la entrega. Cumplimiento ISO 9001:2015 garantizado.",
    gradient: "from-[#0B2447] via-[#0d2d58] to-[#19376D]",
    accent: "#576CBC",
  },
  {
    icon: ShieldCheck,
    tag: "Auditoría integrada",
    title: "Nada se pierde, todo queda registrado",
    body: "Historial completo de cambios de estado, log de auditoría con usuario y timestamp. Preparado para tus próximas auditorías.",
    gradient: "from-[#0d2050] via-[#153a7a] to-[#1a4a96]",
    accent: "#A5D7E8",
  },
  {
    icon: BarChart3,
    tag: "Dashboard operativo",
    title: "Visibilidad del taller en tiempo real",
    body: "Métricas clave, vencimientos próximos, órdenes por estado. Exportá a XLS o PDF con un clic. Tu taller, siempre ordenado.",
    gradient: "from-[#071a38] via-[#0B2447] to-[#19376D]",
    accent: "#576CBC",
  },
];

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
  const [companyName, setCompanyName] = useState("Empresa");

  // Auto-advance slides
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Nombre de la empresa dinámico (para slider + footer)
  useEffect(() => {
    fetch("/api/company-public")
      .then((r) => r.json())
      .then((d) => { if (d?.nombre) setCompanyName(d.nombre); })
      .catch(() => {});
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

      {/* ── Panel izquierdo 60% — Slider ──────────────────────────────── */}
      <div
        className={`hidden lg:flex lg:w-[60%] relative flex-col justify-between p-12 bg-linear-to-br transition-all duration-700 ${currentSlide.gradient}`}
        style={{ minHeight: "100vh" }}
      >
        {/* Patrón decorativo de fondo */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-xl tracking-tight">Zaire</span>
            <span className="block text-white/40 text-xs">{companyName}</span>
          </div>
        </div>

        {/* Slide content */}
        <div className="relative z-10 space-y-8 flex-1 flex flex-col justify-center py-16">
          {/* Tag */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-fit"
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
            <p className="text-white/60 text-lg leading-relaxed max-w-lg">
              {currentSlide.body}
            </p>
          </div>

          {/* Feature bullets */}
          <div className="grid grid-cols-2 gap-3 max-w-lg">
            {[
              "Numeración automática OT/OTS",
              "Historial de estados completo",
              "Export XLS y PDF",
              "Log de auditoría ISO 9001",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-white/50">
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
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              className="w-9 h-9 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Panel derecho 40% — Formulario ────────────────────────────── */}
      <div className="flex-1 lg:w-[40%] flex flex-col min-h-screen bg-[#F7F7F7]">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 p-6 border-b border-gray-200 bg-zaire-navy">
          <Activity className="w-5 h-5 text-white" />
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
            © 2026 {companyName} · ISO 9001:2015 ·{" "}
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
