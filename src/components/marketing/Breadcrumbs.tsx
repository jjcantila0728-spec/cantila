/* ============================================================
   Breadcrumbs — visible trail rendered above the article on
   docs / legal pages. Pairs with the BreadcrumbList JSON-LD
   injected by the (docs) and (legal) layouts so the structured
   data and the visual UI tell the same story.

   The last item is the current page (non-link); everything
   before it is a link.
   ============================================================ */

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export default function Breadcrumbs({ trail }: { trail: BreadcrumbItem[] }) {
  if (trail.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-1.5 text-2xs text-light-ink-faint"
    >
      {trail.map((item, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={`${item.path}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight
                className="h-3 w-3 text-light-ink-faint/60"
                aria-hidden="true"
              />
            )}
            {isLast ? (
              <span
                aria-current="page"
                className="font-medium text-light-ink-dim"
              >
                {item.name}
              </span>
            ) : (
              <Link
                href={item.path}
                className="rounded font-mono uppercase tracking-cantila-kv hover:text-light-ink"
              >
                {item.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
