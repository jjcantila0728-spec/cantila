import Link from "next/link";
import { ArrowRight, Github, Rocket } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";

export const metadata = { title: "Sign in · Cantila Console" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* atmosphere */}
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-96" />

      <div className="relative w-full max-w-sm">
        {/* brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={46} />
          <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
            Cantila Console
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Ship anything, live — from one chat.
          </p>
        </div>

        {/* card */}
        <div className="panel p-6">
          <div className="space-y-3.5">
            <label className="block">
              <span className="kv">Email</span>
              <input
                type="email"
                defaultValue="jjcantila0728@gmail.com"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember placeholder:text-ink-faint"
              />
            </label>
            <label className="block">
              <span className="kv">Password</span>
              <input
                type="password"
                defaultValue="prototype"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember"
              />
            </label>

            <Link
              href="/dashboard"
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-ember text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
            >
              Enter the Console
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </Link>
          </div>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border-soft" />
            <span className="font-mono text-2xs uppercase tracking-widest text-ink-faint">
              or
            </span>
            <span className="h-px flex-1 bg-border-soft" />
          </div>

          <Link
            href="/dashboard"
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 text-sm font-medium text-ink transition-colors hover:border-ink-faint"
          >
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Link>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-2xs text-ink-faint">
          <Rocket className="h-3 w-3 text-ember" />
          MVP prototype — any credentials open the Console.
        </p>
      </div>
    </div>
  );
}
