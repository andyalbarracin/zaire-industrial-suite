<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Suite Zaire — arquitectura

Este proyecto es la **suite Zaire**: una base con **módulos**. Hoy incluye **Zaire Trace**
(trazabilidad de órdenes de trabajo OT/OTS) y **Zaire Field** (gestión de servicio en campo).
La carpeta del repo todavía se llama `sas-trace` por historia; el producto es **Zaire**.

## Módulos — Field es el molde probado
Cada módulo se aísla en cuatro lugares, con el mismo prefijo:
- **Rutas**: `app/(dashboard)/<modulo>/…` — Field: `field/`, Trace: `trace/`
- **Componentes**: `components/<modulo>/` — Field: `components/field/`
- **Lógica/constantes**: `lib/<modulo>/` — Field: `lib/field/`
- **Tablas nuevas** en Supabase: prefijo `<modulo>_` — Field: `field_visits`, `field_expenses`, …

`lib/field/` + `components/field/` + `field/` son la **referencia**: replicar ese molde al sumar módulos.

## Master data compartida — vive en la raíz, no en un módulo
Clientes, productos, historial de auditoría y configuración de empresa son de **la suite**, no de un
módulo. Van en la raíz: rutas `app/(dashboard)/{clientes,productos,historial,configuracion}`,
componentes `components/{clients,products,settings}`. **No** moverlos dentro de un módulo.

## Rutas — centralizadas en `lib/routes.ts`
Toda ruta de navegación vive en `ROUTES` (`src/lib/routes.ts`). **Nunca** hardcodear paths en componentes.
- **Trace** bajo `/trace/*` (`ROUTES.trace.*`). La raíz `/` solo **redirige** a `/trace`.
- **Field** bajo `/field/*` (`ROUTES.field.*`). **Master data** en la raíz (`ROUTES.clientes/productos/historial/configuracion`).
- Rutas con id son **funciones**: `ROUTES.trace.orden(id)`, `ROUTES.field.visita(id)`, `ROUTES.cliente(id)`.
- Mover un módulo de prefijo = editar **solo** `lib/routes.ts`.
- `ROUTE_LABELS` (mismo archivo) mapea segmento → label de breadcrumb.
- Los `/api/**` **no** viven en `ROUTES` (son endpoints, no navegación).

## Tablas legacy sin prefijo
Las tablas anteriores a la modularización (`work_orders`, `work_order_items`, `clients`, `products`,
`order_sequences`, `audit_logs`, `company_settings`, …) **se mantienen sin prefijo**. **No renombrar tablas.**

## Branding y tokens
- Marca: **Zaire** (suite). Módulos: **Zaire Trace**, **Zaire Field**. Fuente única: `lib/branding.ts`
  (`BRANDING.suiteName`, `BRANDING.modules`; alias `BRANDING.systemName` = "Zaire Trace" para el pie de los PDF).
- Tokens de color: `--zaire-*` (CSS) y `zaire-*` en Tailwind (`bg-zaire-navy`, `text-(--zaire-text)`,
  `.zaire-card`, …). Los hex viven en `:root` de `src/app/globals.css`. **No** existen tokens `sas-*`.
- Animaciones: keyframes `z-fade-up` / `z-pop` / `z-grow` (clases `animate-fade-up*`, `animate-z-pop`, `animate-z-grow`).

## Convenciones generales
- Header de 2 líneas al inicio de cada archivo (nombre — path — fecha; y una línea de descripción).
- Mutaciones Supabase: `const sb = supabase as any`. Modelo RLS "authenticated full access" (MVP).
- Middleware en `src/proxy.ts` (Next 16), deny-by-default. Rutas públicas: `/login`, `/terminos`, `/auth`.
- Typecheck: `node ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`.
  Build: `npm run build` (debe cerrar con 0 errores de TS y 0 de ESLint).
