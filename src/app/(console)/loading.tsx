/* ============================================================
   Console loading skeleton.

   Rendered by Next.js inside the (console) layout's <main> while a
   route segment is still resolving — the sidebar and topbar stay
   put, only the page body shows the skeleton. Built from the same
   panel / shimmer-bar vocabulary as the rest of the Console so a
   transition reads as part of the product, not a blank flash.
   ============================================================ */

export default function ConsoleLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      {/* page header */}
      <div className="flex flex-col gap-3 border-b border-border-soft pb-6">
        <div className="shimmer-bar h-2.5 w-24 rounded" />
        <div className="shimmer-bar h-7 w-64 rounded" />
        <div className="shimmer-bar h-3 w-full max-w-md rounded" />
      </div>

      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel flex flex-col gap-3 p-4">
            <div className="shimmer-bar h-2.5 w-16 rounded" />
            <div className="shimmer-bar h-7 w-20 rounded" />
            <div className="shimmer-bar h-2.5 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* body — wide panel + side list */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="panel space-y-4 p-5 lg:col-span-2">
          <div className="shimmer-bar h-4 w-40 rounded" />
          <div className="shimmer-bar h-40 w-full rounded-lg" />
        </div>
        <div className="panel space-y-3 p-5">
          <div className="shimmer-bar h-4 w-28 rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shimmer-bar h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
