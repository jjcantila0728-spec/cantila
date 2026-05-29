import { redirect } from "next/navigation";

/* Mailboxes is now a tab inside the Mail workspace. Preserve old
   links / bookmarks by redirecting to the Mailboxes tab. */
export default function MailboxesPage() {
  redirect("/mail?tab=mailboxes");
}
