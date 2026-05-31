/* Tiny relative-time formatter — "now", "2m ago", "3h ago", "5d ago". */
export function relativeTime(input?: string | number | Date): string {
  if (input == null) return "";
  const then = typeof input === "object" ? input.getTime() : new Date(input).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  if (diff < 0) return "now";
  const s = Math.floor(diff / 1000);
  if (s < 45) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(then).toLocaleDateString();
}
