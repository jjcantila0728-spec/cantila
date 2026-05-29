"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/* ------------------------------------------------------------------
   Password input with a show/hide eye toggle.

   Client component so it can flip the input `type` between
   "password" and "text" on click. Keeps a plain `name` so the
   enclosing server-action <form> reads it exactly as before — the
   toggle is presentational only.
   ------------------------------------------------------------------ */
export default function PasswordField({
  name,
  autoComplete,
  placeholder,
  required = true,
  minLength,
}: {
  name: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative mt-1.5">
      <input
        type={show ? "text" : "password"}
        name={name}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-bg px-3 pr-11 text-sm text-ink outline-none transition-colors focus:border-ember placeholder:text-ink-faint"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
