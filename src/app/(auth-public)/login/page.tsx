/* ============================================================
   Console sign-in (plan §5.4 — per-user OIDC/SSO auth).

   Two submit buttons share one form: "Enter the Console" runs
   password sign-in; "Continue with SSO" runs the SSO provider
   action (a stub today — see src/auth/sso.ts on the control
   plane). Both server actions call helpers in src/lib/auth.ts
   so /signup and /login share the same session-cookie shape
   (including the parent-domain scope in production).
   ============================================================ */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";
import PasswordField from "@/components/PasswordField";
import OAuthButtons from "@/components/OAuthButtons";
import {
  SESSION_COOKIE,
  beginOauth,
  establishSession,
  fetchOauthProviders,
  safeFrom,
} from "@/lib/auth";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Sign in to Cantila",
  description: "Sign in to the Cantila Console — ship anything, live, from one chat.",
  path: "/login",
  absolute: true,
  noindex: true,
});

async function signInWithPassword(formData: FormData) {
  "use server";
  const from = formData.get("from") as string | null;
  const error = await establishSession("/auth/login", {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    const fromQs = from ? `&from=${encodeURIComponent(from)}` : "";
    redirect(`/login?error=${encodeURIComponent(error)}${fromQs}`);
  }
  redirect(safeFrom(from));
}

async function startOauth(formData: FormData) {
  "use server";
  const from = formData.get("from") as string | null;
  const provider = String(formData.get("provider") ?? "");
  if (provider !== "google" && provider !== "github") {
    redirect(`/login?error=${encodeURIComponent("unknown provider")}`);
  }
  const authorizeUrl = await beginOauth(provider, safeFrom(from));
  if (!authorizeUrl) {
    const fromQs = from ? `&from=${encodeURIComponent(from)}` : "";
    redirect(
      `/login?error=${encodeURIComponent("could not start sign-in")}${fromQs}`,
    );
  }
  redirect(authorizeUrl);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string; error?: string };
}) {
  if (cookies().has(SESSION_COOKIE)) redirect("/dashboard");

  const providers = await fetchOauthProviders();
  const anyLive = providers.some((p) => p.live);

  const from =
    typeof searchParams.from === "string" &&
    searchParams.from.startsWith("/") &&
    !searchParams.from.startsWith("//")
      ? searchParams.from
      : "";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : "";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-96" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" aria-label="Cantila home">
            <BrandMark size={46} />
          </Link>
          <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
            Sign in to Cantila
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Ship anything, live — from one chat.
          </p>
        </div>

        <div className="panel p-6">
          {error && (
            <p className="mb-4 rounded-lg border border-down/30 bg-down/5 px-3 py-2 text-2xs text-down">
              {error}
            </p>
          )}

          <form action={signInWithPassword} className="space-y-3.5">
            <input type="hidden" name="from" value={from} />
            <label className="block">
              <span className="kv">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember placeholder:text-ink-faint"
              />
            </label>
            <label className="block">
              <span className="kv">Password</span>
              <PasswordField name="password" autoComplete="current-password" />
            </label>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-ember text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
            >
              Enter the Console
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </button>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-border-soft" />
              <span className="font-mono text-2xs uppercase tracking-widest text-ink-faint">
                or continue with
              </span>
              <span className="h-px flex-1 bg-border-soft" />
            </div>

            <OAuthButtons action={startOauth} providers={providers} />
          </form>

          <p className="mt-5 text-center text-sm text-ink-dim">
            New here?{" "}
            <Link
              href={from ? `/signup?from=${encodeURIComponent(from)}` : "/signup"}
              className="text-ember hover:text-ember-bright"
            >
              Create an account
            </Link>
            {" · "}
            <Link
              href="/forgot"
              className="text-ink-dim underline-offset-4 hover:text-ink hover:underline"
            >
              Forgot password
            </Link>
          </p>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-2xs text-ink-faint">
          <Rocket className="h-3 w-3 text-ember" />
          {anyLive
            ? "MVP prototype — sign-in mints a real session; social login is live."
            : "MVP prototype — sign-in mints a real session; social login is a stub."}
        </p>
      </div>
    </div>
  );
}
