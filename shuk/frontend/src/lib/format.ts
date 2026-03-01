/** Formatting utilities for Hebrew/Israeli financial display */

export function formatILS(value: number | null | undefined, compact = false): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("he-IL", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  return new Intl.DateTimeFormat("he-IL").format(new Date(isoDate));
}
