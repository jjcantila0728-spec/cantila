/* ============================================================
   /mcp — the Cantila MCP server page.

   Per Cantila_Complete_Plan.md §9, the MCP channel is the
   primary GTM lane for the AI-builder beachhead. This page
   has to read like the README a developer wants: tool list,
   install snippet for each major host, what an end-to-end
   ask looks like.
   ============================================================ */

import HeroDarkBand from "@/components/marketing/HeroDarkBand";
import {
  CtaBand,
  PrimaryCta,
  SecondaryCta,
  Section,
} from "@/components/marketing/ui";
import JsonLd from "@/components/JsonLd";
import { buildPageMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Cantila MCP server — ship from Claude",
  description:
    "Add the Cantila MCP server once. Any app built inside Claude can then deploy to Cantila — cantila_deploy, cantila_provision_db, cantila_add_domain, and 22 more tools.",
  path: "/mcp",
  absolute: true,
});

const TOOLS = [
  { name: "cantila_deploy", what: "Ship a project (files or repo) and return a live URL." },
  { name: "cantila_create_project", what: "Create a new project — auto-wired services land on first deploy." },
  { name: "cantila_list_projects", what: "List the user's projects and their status." },
  { name: "cantila_get_logs", what: "Fetch build and runtime logs for a project." },
  { name: "cantila_set_env", what: "Set or update environment variables and secrets." },
  { name: "cantila_provision_db", what: "Create a managed Postgres / Mongo / Redis and link it." },
  { name: "cantila_add_domain", what: "Attach a custom domain and issue SSL." },
  { name: "cantila_scale", what: "Resize or scale a deployment up or down." },
  { name: "cantila_status", what: "Report health, services, domains, and recent deploys." },
  { name: "cantila_connect_git", what: "Connect a repo for push-to-deploy." },
  { name: "cantila_rollback", what: "Roll back to a previous deployment." },
  { name: "cantila_agents_status", what: "Read what the brain has decided and what's queued for review." },
];

export default function McpPage() {
  return (
    <>
      <JsonLd
        payload={breadcrumbJsonLd([
          { name: "Cantila", path: "/" },
          { name: "Cantila MCP", path: "/mcp" },
        ])}
      />
      <HeroDarkBand
        eyebrow="Cantila MCP server"
        title={
          <>
            Ship to Cantila from{" "}
            <span className="text-ember">anywhere you use Claude.</span>
          </>
        }
        description="Add the Cantila MCP server once — Claude Code, the Claude app, Cowork, any MCP host. From then on, every app built inside Claude can deploy to Cantila by asking. 25 tools live today."
        actions={
          <>
            <PrimaryCta href="#install">Install in 30 seconds</PrimaryCta>
            <SecondaryCta href="/docs/mcp" tone="dark">
              Read the docs
            </SecondaryCta>
          </>
        }
      />

      <Section
        id="install"
        eyebrow="Install"
        title="Pick your host. Paste the snippet. Restart Claude."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <CodeCard
            host="Claude Code (`.mcp.json` in your repo)"
            code={`{
  "mcpServers": {
    "cantila": {
      "url": "https://api.cantila.app/v1/mcp",
      "headers": {
        "Authorization": "Bearer \${CANTILA_API_KEY}"
      }
    }
  }
}`}
          />
          <CodeCard
            host="Claude Desktop (`claude_desktop_config.json`)"
            code={`{
  "mcpServers": {
    "cantila": {
      "command": "npx",
      "args": ["-y", "@cantila/mcp"],
      "env": {
        "CANTILA_API_KEY": "ct_live_..."
      }
    }
  }
}`}
          />
          <CodeCard
            host="Stdio (local dev, any MCP host)"
            code={`npx @cantila/mcp \\
  --api-key=$CANTILA_API_KEY \\
  --transport=stdio`}
          />
          <CodeCard
            host="Hosted HTTP (Cowork, Claude app)"
            code={`POST https://api.cantila.app/v1/mcp
Authorization: Bearer $CANTILA_API_KEY
Content-Type: application/json`}
          />
        </div>
        <p className="mt-6 text-sm text-light-ink-faint">
          Don't have an API key yet?{" "}
          <a href="/signup" className="text-ember-on-light hover:underline">
            Create a Cantila account
          </a>{" "}
          — your first key lives in Console → Settings → API keys.
        </p>
      </Section>

      <Section
        eyebrow="Tool surface"
        title="Twenty-five tools, named the way you'd say them out loud."
        description="Naming follows cantila_<verb>_<noun>. Adding tools follows the same pattern — no surprises in the prompt."
        bg="paper"
      >
        <div className="overflow-x-auto rounded-2xl border border-light-border bg-light-bg">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {TOOLS.map((t, i) => (
                <tr
                  key={t.name}
                  className={i % 2 === 0 ? "" : "bg-light-surface/40"}
                >
                  <td className="w-1/3 whitespace-nowrap px-5 py-3 font-mono text-ember-on-light">
                    {t.name}
                  </td>
                  <td className="px-5 py-3 text-light-ink-dim">{t.what}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} className="px-5 py-3 text-2xs text-light-ink-faint">
                  + automation_run, connection_create, billing_summary, agents_status — full list in the API reference
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        eyebrow="One ask, end-to-end"
        title="What it looks like in chat."
      >
        <div className="space-y-4">
          <Bubble who="you">
            ship the repo in this folder to Cantila with a Postgres and the
            domain blogapp.dev
          </Bubble>
          <Bubble who="cantila" tone="agent">
            cantila_deploy · ok · build started for repo. detected Next.js 14.
            <br />
            cantila_provision_db · ok · postgres-17 created, wired into env.
            <br />
            cantila_add_domain · ok · blogapp.dev attached, SSL issued.
            <br />
            <span className="text-live">live · https://blogapp.dev</span>
          </Bubble>
        </div>
      </Section>

      <CtaBand
        title={<>Three tools. One sentence. <span className="text-ember">A live URL.</span></>}
        description="The MCP channel is how the AI builder beachhead meets Cantila. List the server once and your AI tools learn 'deploy to Cantila' as a native capability."
        primary={{ href: "/signup", label: "Get an API key" }}
        secondary={{ href: "/docs/mcp", label: "Read the docs" }}
      />
    </>
  );
}

function CodeCard({ host, code }: { host: string; code: string }) {
  return (
    <div className="rounded-2xl border border-light-border bg-light-bg p-5 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.18)]">
      <p className="mb-3 font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
        {host}
      </p>
      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-light-ink">
        {code}
      </pre>
    </div>
  );
}

function Bubble({
  who,
  tone = "human",
  children,
}: {
  who: string;
  tone?: "human" | "agent";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 text-sm ${
        tone === "agent"
          ? "border-ember-on-light/30 bg-light-bg shadow-[0_18px_50px_-30px_rgba(212,78,33,0.25)]"
          : "border-light-border bg-light-surface/40"
      }`}
    >
      <p className="mb-1 font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
        {who}
      </p>
      <div className="text-light-ink">{children}</div>
    </div>
  );
}
