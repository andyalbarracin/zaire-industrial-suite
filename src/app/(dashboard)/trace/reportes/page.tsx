// page.tsx — src/app/(dashboard)/trace/reportes/page.tsx
// Página de reportes: operativos, financieros y de auditoría

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, TrendingUp, BarChart3, AlertTriangle } from "lucide-react";
import { TabAuditoria } from "@/components/trace/reports/tab-auditoria";
import { TabOperativos } from "@/components/trace/reports/tab-operativos";
import { TabFinancieros } from "@/components/trace/reports/tab-financieros";
import { getCompanyInfo, isCompanyConfigured } from "@/lib/company";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  // Los informes de auditoría se encabezan con los datos de empresa. Si siguen sin configurar, se
  // avisa acá y al exportar: el documento se genera igual (avisar, no bloquear).
  const companyConfigured = isCompanyConfigured(await getCompanyInfo());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Reportes</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          Reportes operativos, financieros y de auditoría
        </p>
      </div>

      {!companyConfigured && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Completá los datos de tu empresa en{" "}
            <Link href={ROUTES.configuracion} className="font-semibold underline underline-offset-2">Ajustes</Link>
            : los informes de auditoría se generan con ellos y hoy salen sin configurar.
          </p>
        </div>
      )}

      <Tabs defaultValue="auditoria">
        <TabsList className="bg-panel border border-(--zaire-border)">
          <TabsTrigger value="auditoria" className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Auditoría
          </TabsTrigger>
          <TabsTrigger value="operativos" className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" /> Operativos
          </TabsTrigger>
          <TabsTrigger value="financieros" className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> Financieros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auditoria" className="mt-4">
          <TabAuditoria companyConfigured={companyConfigured} />
        </TabsContent>
        <TabsContent value="operativos" className="mt-4">
          <TabOperativos />
        </TabsContent>
        <TabsContent value="financieros" className="mt-4">
          <TabFinancieros />
        </TabsContent>
      </Tabs>
    </div>
  );
}
