import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ConversationsView from "@/components/ConversationsView";
import {
  phoneNumbers,
  getNumberBySlug,
  getConversations,
  numberSlug,
} from "@/lib/mock-data";

export function generateStaticParams() {
  return phoneNumbers.map((n) => ({ number: numberSlug(n.number) }));
}

export function generateMetadata({
  params,
}: {
  params: { number: string };
}): Metadata {
  const number = getNumberBySlug(params.number);
  return {
    title: number
      ? `${number.number} · Cantila SMS`
      : "Number · Cantila Console",
  };
}

export default function NumberPage({
  params,
}: {
  params: { number: string };
}) {
  const number = getNumberBySlug(params.number);
  if (!number) notFound();

  return (
    <ConversationsView
      number={number}
      conversations={getConversations(number.number)}
    />
  );
}
