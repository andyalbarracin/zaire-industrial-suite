// footer.tsx — src/components/layout/footer.tsx — 2026-07-13
// Footer de copyright global (Zaire Tracking + Zaire Field).

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-8 pt-4 border-t border-(--sas-border) text-center">
      <p className="text-xs text-(--sas-text-muted)">
        © {year} Zaire Trace · Zaire Field — Desarrollado por Zaire Tech. Todos los derechos reservados.
      </p>
    </footer>
  );
}
