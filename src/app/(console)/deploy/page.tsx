import { Plug } from "lucide-react";
import ChatDeploy from "@/components/ChatDeploy";

export const metadata = { title: "Chat Deploy · Cantila Console" };

export default function DeployPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="kv mb-2 text-ember">Chat Deploy</div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Ship anything, from one chat
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-dim">
            Cantila&apos;s front door — describe an app or drop files and it
            goes live, with the database, domain and SSL already wired in.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-live/25 bg-live/10 px-2.5 py-1.5 text-2xs font-medium text-live sm:self-end">
          <Plug className="h-3.5 w-3.5" />
          MCP server connected
        </span>
      </div>

      <ChatDeploy />
    </div>
  );
}
