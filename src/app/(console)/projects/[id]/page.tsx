import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProjectView from "@/components/ProjectView";
import {
  projects,
  getProject,
  getDeployments,
  getEnvVars,
  getLogs,
  getDomains,
  getDatabase,
} from "@/lib/mock-data";

export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}

export function generateMetadata({
  params,
}: {
  params: { id: string };
}): Metadata {
  const project = getProject(params.id);
  return {
    title: project
      ? `${project.name} · Cantila Console`
      : "Project · Cantila Console",
  };
}

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const project = getProject(params.id);
  if (!project) notFound();

  return (
    <ProjectView
      project={project}
      deployments={getDeployments(project.id)}
      envVars={getEnvVars(project.id)}
      logs={getLogs(project.id)}
      domains={getDomains(project.id)}
      database={getDatabase(project.databaseId)}
    />
  );
}
