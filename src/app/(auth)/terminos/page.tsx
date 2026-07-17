// page.tsx — src/app/(auth)/terminos/page.tsx — 2026-05-20
// Página de Términos y Condiciones y Política de Privacidad de Zaire

import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { ROUTES } from "@/lib/routes";

export const metadata = {
  title: "Términos y Condiciones — Zaire",
  description: "Términos de uso y política de privacidad de Zaire",
};

export const dynamic = "force-dynamic";

export default async function TerminosPage() {
  const sb = createServiceClient();
  let co: { nombre: string | null; cuit: string | null; direccion: string | null; ciudad: string | null; email: string | null } =
    { nombre: "Empresa", cuit: null, direccion: null, ciudad: null, email: null };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any)
      .from("company_settings")
      .select("nombre, cuit, direccion, ciudad, email")
      .eq("id", 1)
      .single();
    if (data) co = { ...co, ...data };
  } catch {}
  const nombre = co.nombre ?? "Empresa";
  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <header className="bg-zaire-navy sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-white" />
            <span className="text-white font-bold tracking-tight">Zaire</span>
          </div>
          <Link
            href={ROUTES.login}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al login
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Términos */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Términos y Condiciones de Uso</h1>
          <p className="text-sm text-gray-400 mb-8">Última actualización: 20 de mayo de 2026</p>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-[15px] leading-relaxed">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Aceptación de los términos</h2>
              <p>
                Al acceder y utilizar Zaire («el Sistema»), usted acepta quedar vinculado por estos Términos y
                Condiciones de Uso. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al
                Sistema. El uso continuo del Sistema después de la publicación de cambios constituye aceptación de
                los nuevos términos.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Descripción del servicio</h2>
              <p>
                Zaire es un sistema web de gestión y trazabilidad de órdenes de trabajo desarrollado
                exclusivamente para uso interno de <strong>{nombre}</strong> y sus usuarios autorizados.
                El Sistema permite registrar, numerar, seguir y auditar órdenes de trabajo (OT y OTS) conforme
                a los requerimientos del sistema de gestión de calidad ISO 9001:2015.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Acceso y cuentas de usuario</h2>
              <p>
                El acceso al Sistema está restringido a empleados y personas debidamente autorizadas por
                {nombre} Cada usuario es responsable de:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Mantener la confidencialidad de sus credenciales de acceso</li>
                <li>Notificar inmediatamente al administrador ante cualquier uso no autorizado de su cuenta</li>
                <li>Todas las actividades realizadas bajo su cuenta</li>
                <li>No compartir sus credenciales con terceros</li>
              </ul>
              <p className="mt-3">
                {nombre} se reserva el derecho de desactivar cuentas de usuario que incumplan estos
                términos, sin previo aviso.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Uso permitido</h2>
              <p>El Sistema puede utilizarse únicamente para:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Registrar y gestionar órdenes de trabajo relacionadas con las actividades de {nombre}</li>
                <li>Consultar el historial de órdenes y estados</li>
                <li>Generar documentación oficial (remitos, órdenes de trabajo, reportes)</li>
                <li>Administrar el catálogo de clientes y productos de la empresa</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Uso prohibido</h2>
              <p>Queda expresamente prohibido:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Acceder al Sistema con fines distintos a los laborales autorizados</li>
                <li>Intentar acceder a áreas del Sistema para las que no se tienen permisos</li>
                <li>Modificar, copiar o distribuir el código fuente del Sistema</li>
                <li>Introducir virus, malware u otro código malicioso</li>
                <li>Realizar ingeniería inversa sobre el Sistema</li>
                <li>Exportar datos del Sistema para uso fuera de {nombre} sin autorización expresa</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Propiedad intelectual</h2>
              <p>
                El Sistema, incluyendo su código fuente, diseño, estructura de base de datos y documentación,
                es propiedad de {nombre} Todos los derechos reservados. El Software fue desarrollado
                a medida para uso interno exclusivo.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Responsabilidad por datos</h2>
              <p>
                Los usuarios son responsables de la exactitud y veracidad de la información que ingresan al Sistema.
                {nombre} no se responsabiliza por errores derivados de datos incorrectos ingresados por
                los usuarios. El Sistema proporciona trazabilidad pero no sustituye el juicio profesional del
                personal autorizado.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Disponibilidad del servicio</h2>
              <p>
                {nombre} realizará sus mejores esfuerzos para mantener el Sistema disponible de forma
                continua, pero no garantiza disponibilidad ininterrumpida. Se realizarán mantenimientos
                programados con previo aviso cuando sea posible.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Modificaciones</h2>
              <p>
                {nombre} se reserva el derecho de modificar estos Términos en cualquier momento.
                Los cambios serán notificados a los usuarios con al menos 7 días de anticipación mediante
                comunicación interna.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">10. Jurisdicción</h2>
              <p>
                Estos Términos se rigen por las leyes de la República Argentina. Cualquier disputa será
                sometida a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.
              </p>
            </div>
          </div>
        </section>

        {/* Privacidad */}
        <section id="privacidad" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidad</h1>
          <p className="text-sm text-gray-400 mb-8">Última actualización: 20 de mayo de 2026</p>

          <div className="space-y-6 text-gray-700 text-[15px] leading-relaxed">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Responsable del tratamiento</h2>
              <p>
                <strong>{nombre}</strong><br />
                {co.cuit && <>CUIT: {co.cuit}<br /></>}
                {(co.direccion || co.ciudad) && <>{[co.direccion, co.ciudad].filter(Boolean).join(", ")}<br /></>}
                {co.email && <>Email: {co.email}</>}
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Datos que recopilamos</h2>
              <p>A través del Sistema recopilamos:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Datos de cuenta:</strong> nombre completo, dirección de email, contraseña (cifrada)</li>
                <li><strong>Datos de uso:</strong> acciones realizadas en el Sistema, timestamps, IP de acceso</li>
                <li><strong>Datos operativos:</strong> información de órdenes de trabajo, clientes, productos ingresados al sistema</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Finalidad del tratamiento</h2>
              <p>Los datos se utilizan exclusivamente para:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Autenticar y autorizar el acceso al Sistema</li>
                <li>Gestionar las operaciones de {nombre}</li>
                <li>Cumplir con los requerimientos de trazabilidad ISO 9001:2015</li>
                <li>Auditoría interna y detección de accesos no autorizados</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Almacenamiento y seguridad</h2>
              <p>
                Los datos se almacenan en servidores de <strong>Supabase</strong> (infraestructura AWS), con
                cifrado en tránsito (TLS/HTTPS) y en reposo. Se implementan políticas de Row-Level Security
                para garantizar que cada usuario accede únicamente a los datos autorizados.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Retención de datos</h2>
              <p>
                Los datos de órdenes de trabajo se conservan indefinidamente como parte del registro histórico
                de la empresa y los requisitos de auditoría ISO. Los datos de cuenta se eliminan a solicitud
                del empleado o al término de la relación laboral, previa evaluación del impacto en registros
                existentes.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">6. No compartimos datos con terceros</h2>
              <p>
                {nombre} no vende, alquila ni comparte datos personales con terceros, excepto cuando
                sea requerido por ley o autoridad competente, o cuando sea necesario para el funcionamiento
                técnico del Sistema (proveedores de infraestructura bajo acuerdos de confidencialidad).
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Derechos del usuario</h2>
              <p>
                En cumplimiento de la Ley 25.326 de Protección de Datos Personales (Argentina), los usuarios
                tienen derecho a acceder, rectificar y suprimir sus datos personales. Para ejercer estos
                derechos, contactar a: <strong>{co.email ?? "—"}</strong>
              </p>
              <p className="mt-2 text-sm text-gray-500">
                La DIRECCIÓN NACIONAL DE PROTECCIÓN DE DATOS PERSONALES (Órgano de Control de la Ley N° 25.326)
                tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al
                incumplimiento de las normas sobre protección de datos personales.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Cookies y sesiones</h2>
              <p>
                El Sistema utiliza cookies de sesión estrictamente necesarias para el funcionamiento de la
                autenticación. No se utilizan cookies de seguimiento, publicidad ni analítica de terceros.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pb-8">
          <Link
            href={ROUTES.login}
            className="inline-flex items-center gap-2 text-sm text-zaire-blue hover:text-zaire-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al login
          </Link>
        </div>
      </main>
    </div>
  );
}
