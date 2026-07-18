// page.tsx — src/app/(dashboard)/trace/reportes/page.tsx
// Página de reportes: operativos, financieros y de auditoría

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, TrendingUp, BarChart3 } from "lucide-react";
import { TabAuditoria } from "@/components/trace/reports/tab-auditoria";
import { TabOperativos } from "@/components/trace/reports/tab-operativos";
import { TabFinancieros } from "@/components/trace/reports/tab-financieros";

export const dynamic = "force-dynamic";

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Reportes</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          Reportes operativos, financieros y de auditoría
        </p>
      </div>

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
          <TabAuditoria />
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
