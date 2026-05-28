import { notFound } from "next/navigation";
import type { Metadata } from "next";
import MailboxView from "@/components/MailboxView";
import {
  mailboxes,
  getMailboxBySlug,
  getEmails,
  mailboxSlug,
} from "@/lib/mock-data";

export function generateStaticParams() {
  return mailboxes.map((m) => ({ box: mailboxSlug(m.address) }));
}

export function generateMetadata({
  params,
}: {
  params: { box: string };
}): Metadata {
  const mailbox = getMailboxBySlug(params.box);
  return {
    title: mailbox
      ? `${mailbox.address} · Cantila Mail`
      : "Mailbox · Cantila Console",
  };
}

export default function MailboxPage({ params }: { params: { box: string } }) {
  const mailbox = getMailboxBySlug(params.box);
  if (!mailbox) notFound();

  return <MailboxView mailbox={mailbox} emails={getEmails(mailbox.address)} />;
}
