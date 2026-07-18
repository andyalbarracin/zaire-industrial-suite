"use client";
// lead-detail.tsx — src/components/crm/lead-detail.tsx — 2026-07-17
// Ficha de lead (página): datos + propiedades + score, timeline de actividades y archivos.
// Reusa LeadForm (editar) y LeadConvertDialog (convertir a cliente).

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, ArrowRightLeft, Building2, User, Mail, Phone, Globe, Factory, Star, CalendarClock, Wallet } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadForm } from "./lead-form";
import { LeadConvertDialog } from "./lead-convert-dialog";
import { ActivityTimeline } from "./activity-timeline";
import { CrmAttachments } from "./crm-attachments";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_SOURCE_LABELS } from "@/lib/crm/constants";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import type { CrmLead, CrmActivity, CrmAttachment, LeadSource } from "@/lib/crm/types";
import type { Profile } from "@/lib/types/database";

interface LeadDetailProps {
  lead: CrmLead;
  activities: CrmActivity[];
  attachments: CrmAttachment[];
  profiles: Pick<Profile, "id" | "full_name">[];
  currentProfile: { id: string } | null;
}

export function LeadDetail({ lead, activities, attachments, profiles, currentProfile }: LeadDetailProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const canConvert = lead.status !== "convertido" && lead.status !== "descartado";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={ROUTES.crm.leads} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
            <ChevronLeft className="w-4 h-4" /> Volver a leads
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-(--zaire-text)">{lead.company_name ?? lead.contact_name ?? "Lead"}</h1>
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", LEAD_STATUS_COLORS[lead.status])}>
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
            {lead.score != null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30">
                <Star className="w-3 h-3 fill-amber-400" /> {lead.score}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canConvert && (
            <Button variant="outline" onClick={() => setConvertOpen(true)}><ArrowRightLeft className="w-4 h-4 mr-1.5" /> Convertir a cliente</Button>
          )}
          <Button variant="outline" onClick={() => setFormOpen(true)}><Pencil className="w-4 h-4 mr-1.5" /> Editar</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Datos */}
        <div className="zaire-card p-5 space-y-2.5 text-sm">
          <Row icon={Building2} label="Empresa" value={lead.company_name ?? "—"} />
          <Row icon={User} label="Contacto" value={lead.contact_name ?? "—"} />
          <Row icon={Mail} label="Email" value={lead.email ?? "—"} />
          <Row icon={Phone} label="Teléfono" value={lead.phone ?? "—"} />
          <Row icon={Factory} label="Industria" value={lead.industry ?? "—"} />
          <Row icon={Globe} label="Web" value={lead.website ?? "—"} />
          <Row icon={User} label="Origen" value={lead.source ? LEAD_SOURCE_LABELS[lead.source as LeadSource] : "—"} />
          <Row icon={User} label="Responsable" value={lead.owner?.full_name ?? "—"} />
          <Row icon={Wallet} label="Valor est." value={lead.estimated_value != null ? formatCurrency(lead.estimated_value, lead.currency) : "—"} />
          <Row icon={CalendarClock} label="Próx. acción" value={lead.next_action_at ? formatDateTime(lead.next_action_at) : "—"} />
          {lead.status === "descartado" && lead.discard_reason && (
            <p className="text-(--zaire-text-muted) pt-1 border-t border-(--zaire-border)">Descarte: {lead.discard_reason}</p>
          )}
          {lead.notes && <p className="text-(--zaire-text-muted) pt-1 border-t border-(--zaire-border)">{lead.notes}</p>}
        </div>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="actividades">
            <TabsList>
              <TabsTrigger value="actividades">Actividades ({activities.length})</TabsTrigger>
              <TabsTrigger value="archivos">Archivos ({attachments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="actividades" className="mt-4">
              <div className="zaire-card p-5">
                <ActivityTimeline activities={activities} emptyLabel="Sin actividades. Registralas desde la sección Actividades." />
              </div>
            </TabsContent>
            <TabsContent value="archivos" className="mt-4">
              <CrmAttachments entityType="lead" entityId={lead.id} initialAttachments={attachments} currentProfile={currentProfile} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <LeadForm open={formOpen} onOpenChange={setFormOpen} lead={lead} profiles={profiles} onSaved={() => router.refresh()} />
      <LeadConvertDialog open={convertOpen} onOpenChange={setConvertOpen} lead={lead} onConverted={() => router.refresh()} />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-(--zaire-text-muted) shrink-0" />
      <span className="text-(--zaire-text-muted) w-24 shrink-0">{label}</span>
      <span className="text-(--zaire-text) font-medium truncate">{value}</span>
    </div>
  );
}
