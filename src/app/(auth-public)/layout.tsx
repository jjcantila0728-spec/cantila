/* ============================================================
   Public auth shell — login, signup, forgot.

   The atmosphere matches the dark Console: warm charcoal, an
   ember-glow band at the top, the dot-grid texture. The pages
   that live in this group render their own card centered in
   the viewport — the layout supplies just the canvas.
   ============================================================ */

export default function AuthPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-bg text-ink">{children}</div>;
}
