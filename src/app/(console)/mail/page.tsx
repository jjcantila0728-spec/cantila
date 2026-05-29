import MailWorkspace, { type MailTab } from "@/components/MailWorkspace";

export const metadata = { title: "Mail · Cantila Console" };

export default function MailPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const initialTab: MailTab =
    searchParams?.tab === "mailboxes" ? "mailboxes" : "overview";
  return <MailWorkspace initialTab={initialTab} />;
}
