// footer.tsx — src/components/layout/footer.tsx — 2026-07-13
// Footer de copyright global (Zaire Industrial Suite).

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-8 pt-4 border-t border-(--zaire-border) text-center">
      <p className="text-xs text-(--zaire-text-muted)">
        © {year} Zaire Industrial Suite V2.0.0 — Desarrollado por Zaire Tech. Todos los derechos reservados.
      </p>
    </footer>
  );
}
