/* ============================================================
   <JsonLd> — renders a schema.org payload as a JSON-LD script.

   Accepts a single payload or an array (the latter renders one
   <script> tag per payload — schema.org allows graph syntax but
   per-tag is friendlier to validators). The Cantila SeoAgent
   parses these tags from the live HTML to verify each page
   carries the expected schemas.
   ============================================================ */

interface JsonLdProps {
  payload: Record<string, unknown> | Record<string, unknown>[];
}

export default function JsonLd({ payload }: JsonLdProps) {
  const payloads = Array.isArray(payload) ? payload : [payload];
  return (
    <>
      {payloads.map((p, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            // Escape `<` so a payload value containing `</script>` cannot
            // break out of the JSON-LD <script> tag.
            __html: JSON.stringify(p).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
