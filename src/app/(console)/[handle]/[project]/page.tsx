import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProjectWorkspace from "@/components/ProjectWorkspace";

interface PageProps {
  params: { handle: string; project: string };
  searchParams: { build?: string };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const handle = decodeURIComponent(params.handle);
  const project = decodeURIComponent(params.project);
  return { title: `${project} · ${handle} · Cantila` };
}

/* ============================================================
   User-oriented project route: /@handle/<name>

   Replaces the legacy /projects/live/[id] and /automations/[id]
   routes. The dynamic [handle] segment receives the literal
   "@jjcantila" string — Next.js folder names cannot start with
   "@" (the prefix is reserved for parallel routes), so the
   route validates the leading "@" on the server and 404s on
   anything else.

   The workspace itself is client-side because it embeds a live
   chat + SSE streams; the page resolves the project on the
   client too via api.getProjectByHandle, since the same proxy
   path the rest of the console uses (/api/cantila/v1/*) carries
   the session cookie cleanly.
   ============================================================ */

export default function HandledProjectPage({ params }: PageProps) {
  const handle = decodeURIComponent(params.handle);
  const project = decodeURIComponent(params.project);
  if (!handle.startsWith("@")) notFound();
  return (
    <ProjectWorkspace
      handle={handle.slice(1)}
      projectName={project}
    />
  );
}
