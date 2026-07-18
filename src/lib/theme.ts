"use client";
// theme.ts — src/lib/theme.ts — 2026-07-18
// Sistema de temas Zaire: persistencia (localStorage) + aplicación al <html> + hook React.
// Sin dependencias (no next-themes). El no-flash inicial lo hace un script inline en layout.tsx.

import { useSyncExternalStore } from "react";
import { BRANDING } from "@/lib/branding";

export type ThemeName = "bronze" | "azul" | "bordo";
export type ThemeMode = "light" | "dark" | "system";

export const THEME_OPTIONS: { id: ThemeName; label: string; swatch: string }[] = [
  { id: "azul", label: "Azul", swatch: "#19376D" },
  { id: "bronze", label: "Bronce", swatch: "#9E701B" },
  { id: "bordo", label: "Bordó", swatch: "#9A2A38" },
];

export const MODE_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Claro" },
  { id: "dark", label: "Oscuro" },
  { id: "system", label: "Sistema" },
];

export const DEFAULT_THEME = (BRANDING.defaultTheme ?? "azul") as ThemeName;
export const DEFAULT_MODE: ThemeMode = "light";

const THEME_KEY = "zaire-theme";
const MODE_KEY = "zaire-mode";

const isTheme = (v: string | null): v is ThemeName => v === "bronze" || v === "azul" || v === "bordo";
const isMode = (v: string | null): v is ThemeMode => v === "light" || v === "dark" || v === "system";

function readTheme(): ThemeName {
  if (typeof window === "undefined") return DEFAULT_THEME;
  return isTheme(localStorage.getItem(THEME_KEY)) ? (localStorage.getItem(THEME_KEY) as ThemeName) : DEFAULT_THEME;
}
function readMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  return isMode(localStorage.getItem(MODE_KEY)) ? (localStorage.getItem(MODE_KEY) as ThemeMode) : DEFAULT_MODE;
}
function systemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}
export function resolveDark(mode: ThemeMode): boolean {
  return mode === "dark" || (mode === "system" && systemDark());
}

function apply(theme: ThemeName, mode: ThemeMode) {
  const d = document.documentElement;
  d.setAttribute("data-theme", theme);
  d.classList.toggle("dark", resolveDark(mode));
}

// --- store mínimo compatible con useSyncExternalStore ---
type Snap = { theme: ThemeName; mode: ThemeMode };
const SERVER_SNAP: Snap = { theme: DEFAULT_THEME, mode: DEFAULT_MODE };
let snap: Snap = typeof window === "undefined" ? SERVER_SNAP : { theme: readTheme(), mode: readMode() };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const onSys = () => { if (snap.mode === "system") { apply(snap.theme, snap.mode); emit(); } };
  mq?.addEventListener("change", onSys);
  return () => { listeners.delete(cb); mq?.removeEventListener("change", onSys); };
}
const getSnapshot = () => snap;
const getServerSnapshot = () => SERVER_SNAP;

export function setTheme(theme: ThemeName) {
  snap = { ...snap, theme };
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
  apply(theme, snap.mode);
  emit();
}
export function setMode(mode: ThemeMode) {
  snap = { ...snap, mode };
  try { localStorage.setItem(MODE_KEY, mode); } catch {}
  apply(snap.theme, mode);
  emit();
}
/** Toggle rápido claro↔oscuro (usa el estado resuelto actual; descarta "system"). */
export function toggleMode() {
  setMode(resolveDark(snap.mode) ? "light" : "dark");
}

export function useTheme() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme: s.theme, mode: s.mode, isDark: resolveDark(s.mode), setTheme, setMode, toggleMode };
}
