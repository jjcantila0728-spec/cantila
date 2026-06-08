import AutomationWorkspace from "@/components/AutomationWorkspace";

export const metadata = { title: "Automation · Cantila Console" };

/* The automation workspace. Automations used to redirect into the
 * generic project workspace (chat + file editor); they now get their
 * own workflow-focused home rooted at `/automations/[id]`. */
export default function AutomationPage({ params }: { params: { id: string } }) {
  return <AutomationWorkspace automationId={params.id} />;
}
