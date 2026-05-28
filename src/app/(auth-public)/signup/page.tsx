/* ============================================================
   Console sign-up. Submits to /v1/auth/register on the control
   plane (already shipped) and mints the same session cookie
   that /login does — so a brand-new user lands directly on
   /dashboard with no second authentication round trip.
   ============================================================ */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";
import { SESSION_COOKIE, establishSession, safeFrom } from "@/lib/auth";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Create your Cantila account",
  description:
    "Free to start. Ship your first project on Cantila from one chat. No card required for the Hobby plan.",
  path: "/signup",
  absolute: true,
});

async function signUp(formData: FormData) {
  "use server";
  const from = formData.get("from") as string | null;
  const error = await establishSession("/auth/register", {
    name: String(formData.get("name") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    const fromQs = from ? `&from=${encodeURIComponent(from)}` : "";
    redirect(`/signup?error=${encodeURIComponent(error)}${fromQs}`);
  }
  redirect(safeFrom(from));
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { from?: string; error?: string };
}) {
  if (cookies().has(SESSION_COOKIE)) redirect("/dashboard");

  const from =
    typeof searchParams.from === "string" &&
    searchParams.from.startsWith("/") &&
    !searchParams.from.startsWith("//")
      ? searchParams.from
      : "";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : "";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-96" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" aria-label="Cantila home">
            <BrandMark size={46} />
          </Link>
          <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
            Create your Cantila account
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Free to start. Ship your first project from one chat.
          </p>
        </div>

        <div className="panel p-6">
          {error && (
            <p className="mb-4 rounded-lg border border-down/30 bg-down/5 px-3 py-2 text-2xs text-down">
              {error}
            </p>
          )}

          <form action={signUp} className="space-y-3.5">
            <input type="hidden" name="from" value={from} />
            <label className="block">
              <span className="kv">Name</span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Optional"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember placeholder:text-ink-faint"
              />
            </label>
            <label className="block">
              <span className="kv">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember"
              />
            </label>
            <label className="block">
              <span className="kv">Password</span>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember"
              />
              <span className="mt-1 block text-2xs text-ink-faint">
                At least 8 characters.
              </span>
            </label>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-ember text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
            >
              Create account
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-dim">
            Already on Cantila?{" "}
            <Link
              href={from ? `/login?from=${encodeURIComponent(from)}` : "/login"}
              className="text-ember hover:text-ember-bright"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-2xs text-ink-faint">
          <Rocket className="h-3 w-3 text-ember" />
          By creating an account you agree to the{" "}
          <Link href="/legal/terms" className="underline-offset-4 hover:text-ink hover:underline">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline-offset-4 hover:text-ink hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
