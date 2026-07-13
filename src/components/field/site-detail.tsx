"use client";
// site-detail.tsx — src/components/field/site-detail.tsx — 2026-07-13
// Ficha de planta/sitio: datos, mapa con geocerca y edición.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, MapPin, Building2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldMap, type MapMarker } from "@/components/field/field-map";
import { SiteForm } from "@/components/field/site-form";
import { cn } from "@/lib/utils";
import type { FieldSite, Client } from "@/lib/field/types";

interface SiteDetailProps {
  site: FieldSite;
  clients: Client[];
}

export function SiteDetail({ site: initial, clients }: SiteDetailProps) {
  const router = useRouter();
  const [site, setSite] = useState(initial);
  const [editOpen, setEditOpen] = useState(false);

  const hasCoords = site.latitude != null && site.longitude != null;
  const markers: MapMarker[] = hasCoords ? [{ id: site.id, lat: site.latitude!, lng: site.longitude!, kind: "site", label: site.name }] : [];
  const geofences = hasCoords ? [{ lat: site.latitude!, lng: site.longitude!, radius: site.geofence_radius_m }] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/field/plantas" className="inline-flex items-center gap-1 text-sm text-(--sas-text-muted) hover:text-sas-blue mb-2">
            <ChevronLeft className="w-4 h-4" /> Volver a plantas
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-(--sas-text)">{site.name}</h1>
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", site.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
              {site.is_active ? "Activa" : "Inactiva"}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="w-4 h-4 mr-1.5" /> Editar</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="sas-card p-5 space-y-2.5 text-sm">
          <h2 className="text-sm font-semibold text-(--sas-text) uppercase tracking-wide mb-1">Datos</h2>
          <Row icon={Building2} label="Cliente" value={site.client?.business_name ?? "—"} />
          <Row icon={MapPin} label="Dirección" value={site.address ?? "—"} />
          <Row icon={MapPin} label="Ciudad" value={[site.city, site.province].filter(Boolean).join(", ") || "—"} />
          <Row icon={MapPin} label="Geocerca" value={hasCoords ? `${site.geofence_radius_m} m` : "Sin ubicación"} />
          <Row icon={Phone} label="Contacto" value={site.contact_name ?? "—"} />
          <Row icon={Phone} label="Teléfono" value={site.contact_phone ?? "—"} />
          {site.notes && <div className="pt-1"><p className="text-(--sas-text-muted)">Notas</p><p className="text-(--sas-text)">{site.notes}</p></div>}
        </div>

        <div className="lg:col-span-2 sas-card p-5">
          <h2 className="text-sm font-semibold text-(--sas-text) uppercase tracking-wide mb-3">Ubicación y geocerca</h2>
          {hasCoords ? (
            <FieldMap markers={markers} geofences={geofences} center={[site.latitude!, site.longitude!]} zoom={13} height={360} />
          ) : (
            <p className="text-sm text-(--sas-text-muted) py-8 text-center">Esta planta no tiene coordenadas cargadas. Editala para fijar la ubicación.</p>
          )}
        </div>
      </div>

      <SiteForm open={editOpen} onOpenChange={setEditOpen} site={site} clients={clients} onSaved={(s) => { setSite((prev) => ({ ...prev, ...s })); router.refresh(); }} />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-(--sas-text-muted) shrink-0" />
      <span className="text-(--sas-text-muted) w-24 shrink-0">{label}</span>
      <span className="text-(--sas-text) font-medium truncate">{value}</span>
    </div>
  );
}
