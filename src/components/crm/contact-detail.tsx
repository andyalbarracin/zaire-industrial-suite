"use client";
// contact-detail.tsx — src/components/crm/contact-detail.tsx — 2026-07-17
// Ficha de contacto (página): datos, cliente/lead padre, actividades y archivos.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, User, Mail, Phone, Briefcase, Building2, Star } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactForm } from "./contact-form";
import { ActivityTimeline } from "./activity-timeline";
import { CrmAttachments } from "./crm-attachments";
import { cn } from "@/lib/utils";
import type { CrmContact, CrmActivity, CrmAttachment, Client } from "@/lib/crm/types";

interface ContactDetailProps {
  contact: CrmContact;
  activities: CrmActivity[];
  attachments: CrmAttachment[];
  clients: Client[];
  currentProfile: { id: string } | null;
}

export function ContactDetail({ contact, activities, attachments, clients, currentProfile }: ContactDetailProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const parent = contact.client?.business_name ?? contact.lead?.company_name ?? contact.lead?.contact_name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={ROUTES.crm.contactos} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
            <ChevronLeft className="w-4 h-4" /> Volver a contactos
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            {contact.is_primary && <Star className="w-4 h-4 text-amber-500 fill-amber-400" />}
            <h1 className="text-2xl font-bold text-(--zaire-text)">{contact.full_name}</h1>
            {contact.role_title && <span className="text-sm text-(--zaire-text-muted)">· {contact.role_title}</span>}
          </div>
        </div>
        <Button variant="outline" onClick={() => setFormOpen(true)}><Pencil className="w-4 h-4 mr-1.5" /> Editar</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="zaire-card p-5 space-y-2.5 text-sm">
          <Row icon={User} label="Nombre" value={contact.full_name} />
          <Row icon={Briefcase} label="Cargo" value={contact.role_title ?? "—"} />
          <Row icon={Mail} label="Email" value={contact.email ?? "—"} />
          <Row icon={Phone} label="Teléfono" value={contact.phone ?? "—"} />
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-(--zaire-text-muted) shrink-0" />
            <span className="text-(--zaire-text-muted) w-20 shrink-0">Cuenta</span>
            {contact.client_id ? (
              <Link href={ROUTES.crm.cuenta(contact.client_id)} className="text-zaire-blue font-medium truncate hover:underline">{parent}</Link>
            ) : (
              <span className="text-(--zaire-text) font-medium truncate">{parent}</span>
            )}
          </div>
          {contact.notes && <p className="text-(--zaire-text-muted) pt-1 border-t border-(--zaire-border)">{contact.notes}</p>}
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="actividades">
            <TabsList>
              <TabsTrigger value="actividades">Actividades ({activities.length})</TabsTrigger>
              <TabsTrigger value="archivos">Archivos ({attachments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="actividades" className="mt-4">
              <div className="zaire-card p-5">
                <ActivityTimeline activities={activities} />
              </div>
            </TabsContent>
            <TabsContent value="archivos" className="mt-4">
              <CrmAttachments entityType="contact" entityId={contact.id} initialAttachments={attachments} currentProfile={currentProfile} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ContactForm open={formOpen} onOpenChange={setFormOpen} contact={contact} clients={clients} onSaved={() => router.refresh()} />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("w-4 h-4 text-(--zaire-text-muted) shrink-0")} />
      <span className="text-(--zaire-text-muted) w-20 shrink-0">{label}</span>
      <span className="text-(--zaire-text) font-medium truncate">{value}</span>
    </div>
  );
}
