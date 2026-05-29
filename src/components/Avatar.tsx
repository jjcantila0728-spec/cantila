/* Avatar — renders a profile image when a URL is present, else the
 * initials fallback the Console uses elsewhere. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  url,
  name,
  size = 32,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-100"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}
