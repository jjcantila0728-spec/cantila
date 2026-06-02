import { Github } from "lucide-react";

/** Multi-colour Google "G" mark (lucide ships no brand glyph for it). */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

const BTN =
  "flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 text-sm font-medium text-ink transition-colors hover:border-ink-faint hover:bg-surface-3";

/**
 * Google + GitHub sign-in buttons.
 *
 * Rendered inside the page's auth <form>, so they inherit the hidden
 * `from` field. The provider is passed to the server action as a *bound
 * argument* (`action.bind(null, "google")`), NOT through the submitter
 * button's name/value pair: React server actions serialize the form's
 * fields into FormData but drop the submitter's name/value, so a button
 * `name="provider"` never reaches the action — that's why every SSO
 * click previously failed with "unknown provider". `formNoValidate` is
 * required: without it, submitting the shared password form runs HTML5
 * constraint validation on the `required` email/password inputs first,
 * so the browser blocks the OAuth submit with "email is required"
 * before the server action ever runs (SSO needs neither field). Only
 * providers the control plane reports are rendered; an empty list
 * (control plane unreachable) shows both so the dev/stub flow still
 * round-trips.
 */
export default function OAuthButtons({
  action,
  providers,
}: {
  action: (provider: string, formData: FormData) => void;
  providers: Array<{ id: string; label: string; live: boolean }>;
}) {
  const ids = new Set(providers.map((p) => p.id));
  const show = (id: string) => ids.size === 0 || ids.has(id);
  return (
    <div className="grid grid-cols-2 gap-2">
      {show("google") && (
        <button
          type="submit"
          formAction={action.bind(null, "google")}
          formNoValidate
          className={BTN}
        >
          <GoogleIcon className="h-4 w-4" />
          Google
        </button>
      )}
      {show("github") && (
        <button
          type="submit"
          formAction={action.bind(null, "github")}
          formNoValidate
          className={BTN}
        >
          <Github className="h-4 w-4" />
          GitHub
        </button>
      )}
    </div>
  );
}
