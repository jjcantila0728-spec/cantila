/* ============================================================
   Console super-user guard (super-user management, slice 1).

   Server-side only. Reads the session cookie and resolves the caller
   via the control plane's /v1/me. Returns the user when they hold a
   platform role, else null. The (admin) layout calls notFound() on
   null so the back-office 404-cloaks for everyone else — its very
   existence is not advertised.
   ============================================================ */

import { cookies } from "next/headers";
import { SESSION_COOKIE, CONTROL_PLANE_URL } from "./auth";

export interface SuperUser {
  id: string;
  email: string;
  name: string;
  platformRole: "superadmin" | "support";
}

/** Resolve the current super-user, or null when the caller is anonymous,
 *  an API-key caller, or an ordinary tenant user. Never throws. */
export async function getSuperUser(): Promise<SuperUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${CONTROL_PLANE_URL}/v1/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const me = (await res.json()) as {
      authenticated?: boolean;
      user?: {
        id: string;
        email: string;
        name: string;
        platformRole?: "superadmin" | "support" | null;
      } | null;
    };
    const user = me.authenticated ? me.user : null;
    if (!user || !user.platformRole) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      platformRole: user.platformRole,
    };
  } catch {
    return null;
  }
}
