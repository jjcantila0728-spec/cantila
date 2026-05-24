import { redirect } from "next/navigation";

export default function RootPage() {
  // The Console opens straight onto the dashboard.
  // A real build would gate this behind an auth check → /login.
  redirect("/dashboard");
}
