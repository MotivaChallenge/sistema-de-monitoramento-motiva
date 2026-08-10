import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata datas ISO (YYYY-MM-DD) ou timestamps no padrão brasileiro. */
export function formatDateBR(value?: string | null): string {
  if (!value) return "—";
  const iso = /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
  const d = iso ? new Date(`${iso}T12:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
