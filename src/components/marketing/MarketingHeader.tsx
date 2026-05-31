"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";
import { PRODUCTS } from "@/lib/site-meta";

/** Persistent top nav for the marketing surface. Sticks to the top of
 *  the viewport, sits flush over the light body, and gains a hairline
 *  border on scroll for separation. Mobile collapses behind a sheet. */
export default function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open so the underlying
  // page doesn't scroll behind the sheet on touch devices.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-light-border/60 bg-light-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-9">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Cantila home"
        >
          <BrandMark size={28} />
          <span className="font-display text-lg font-semibold tracking-cantila-display text-light-ink">
            cantila
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <ProductsDropdown
            open={productsOpen}
            onOpenChange={setProductsOpen}
          />
          <NavLink href="/pricing">Pricing</NavLink>
          <NavLink href="/mcp">MCP</NavLink>
          <NavLink href="/docs">Docs</NavLink>
          <NavLink href="/changelog">Changelog</NavLink>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-light-ink-dim transition-colors hover:text-light-ink"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-ember-on-light px-3.5 py-2 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_rgba(212,78,33,0.55)] transition-colors hover:bg-[#e85f2a]"
          >
            Start free
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
          </Link>
        </div>

        <button
          type="button"
          aria-label="Open menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-light-ink lg:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>

      {/* Mobile menu sheet — rendered OUTSIDE <header> on purpose. The
          header's `backdrop-blur` makes it the containing block for any
          `position: fixed` descendant, which would clip this overlay to
          the 64px bar (the mobile menu rendered but stayed invisible). As
          a sibling it resolves `inset-0` against the viewport instead —
          mirroring the Console drawer, which lives at the shell root, not
          inside its blurred Topbar. */}
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-light-bg lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <Link
              href="/"
              className="flex items-center gap-2.5"
              onClick={() => setOpen(false)}
            >
              <BrandMark size={28} />
              <span className="font-display text-lg font-semibold tracking-cantila-display text-light-ink">
                cantila
              </span>
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-light-ink"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-1 px-4 pb-8 pt-3">
            <MobileGroup label="Products">
              {PRODUCTS.map((p) => (
                <MobileLink
                  key={p.slug}
                  href={`/products/${p.slug}`}
                  onClick={() => setOpen(false)}
                >
                  {p.name}
                </MobileLink>
              ))}
            </MobileGroup>
            <MobileLink href="/pricing" onClick={() => setOpen(false)}>
              Pricing
            </MobileLink>
            <MobileLink href="/mcp" onClick={() => setOpen(false)}>
              Cantila MCP
            </MobileLink>
            <MobileLink href="/docs" onClick={() => setOpen(false)}>
              Docs
            </MobileLink>
            <MobileLink href="/changelog" onClick={() => setOpen(false)}>
              Changelog
            </MobileLink>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center rounded-lg border border-light-border text-sm font-medium text-light-ink"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center rounded-lg bg-ember-on-light text-sm font-semibold text-white"
              >
                Start free
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-light-ink-dim transition-colors hover:text-light-ink"
    >
      {children}
    </Link>
  );
}

function ProductsDropdown({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  return (
    <div
      className="relative"
      onMouseEnter={() => onOpenChange(true)}
      onMouseLeave={() => onOpenChange(false)}
    >
      <button
        type="button"
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-light-ink-dim transition-colors hover:text-light-ink"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        Products
      </button>
      {open && (
        <div className="absolute left-0 top-full w-[520px] pt-2">
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-light-border bg-light-bg p-2 shadow-lift">
            {PRODUCTS.map((p) => {
              const Icon = p.icon;
              return (
                <Link
                  key={p.slug}
                  href={`/products/${p.slug}`}
                  className="group flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-light-surface"
                  onClick={() => onOpenChange(false)}
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-light-surface-2 text-ember-on-light">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-light-ink">
                      {p.name}
                    </span>
                    <span className="block text-[12.5px] leading-snug text-light-ink-dim">
                      {p.short}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-light-border-soft py-3">
      <p className="px-3 pb-2 font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium text-light-ink hover:bg-light-surface"
    >
      {children}
    </Link>
  );
}
