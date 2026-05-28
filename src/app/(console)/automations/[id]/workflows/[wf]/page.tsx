import WorkflowEditor from "@/components/WorkflowEditor";

export const metadata = { title: "Workflow editor · Cantila Console" };

export default function WorkflowEditorPage({
  params,
}: {
  params: { id: string; wf: string };
}) {
  return <WorkflowEditor automationId={params.id} workflowId={params.wf} />;
}
