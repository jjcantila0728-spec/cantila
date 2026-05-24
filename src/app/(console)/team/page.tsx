import { UserPlus, Shield, Crown, Code2, Eye } from "lucide-react";
import { PageHeader, Pill, cx } from "@/components/ui";
import { team } from "@/lib/mock-data";
import type { TeamMember } from "@/lib/types";

export const metadata = { title: "Team · Cantila Console" };

const ROLE_TONE: Record<TeamMember["role"], "ember" | "info" | "live" | "neutral"> =
  {
    Owner: "ember",
    Admin: "info",
    Developer: "live",
    Viewer: "neutral",
  };

const ROLES = [
  {
    name: "Owner",
    icon: Crown,
    tone: "text-ember",
    desc: "Full control — billing, deletion, and ownership transfer.",
  },
  {
    name: "Admin",
    icon: Shield,
    tone: "text-info",
    desc: "Manage projects, domains, secrets and team members.",
  },
  {
    name: "Developer",
    icon: Code2,
    tone: "text-live",
    desc: "Deploy, read logs and edit environment variables.",
  },
  {
    name: "Viewer",
    icon: Eye,
    tone: "text-ink-dim",
    desc: "Read-only access to projects, metrics and logs.",
  },
];

export default function TeamPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Team"
        lead="Invite collaborators and control what each member can do across the workspace."
        actions={
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright">
            <UserPlus className="h-4 w-4" strokeWidth={2.4} />
            Invite member
          </button>
        }
      />

      {/* members */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">
          Members · {team.length} seats used
        </h2>
        <div className="panel overflow-hidden p-0">
          <div className="divide-y divide-border-soft">
            {team.map((m) => (
              <div key={m.email} className="flex items-center gap-3.5 px-5 py-3.5">
                <span
                  className={cx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
                    m.you
                      ? "bg-gradient-to-br from-ember to-ember-dim text-[#1a0e08]"
                      : "bg-surface-3 text-ink-dim",
                  )}
                >
                  {m.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {m.name}
                    </span>
                    {m.you && <Pill tone="neutral">You</Pill>}
                  </div>
                  <div className="truncate font-mono text-2xs text-ink-faint">
                    {m.email}
                  </div>
                </div>
                <span className="hidden font-mono text-2xs text-ink-faint sm:block">
                  Active {m.lastActive}
                </span>
                <Pill tone={ROLE_TONE[m.role]}>{m.role}</Pill>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* roles */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Roles & permissions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.name} className="panel p-5">
                <Icon className={cx("h-5 w-5", r.tone)} />
                <h3 className="mt-3 font-display text-sm font-semibold text-ink">
                  {r.name}
                </h3>
                <p className="mt-1 text-2xs leading-relaxed text-ink-faint">
                  {r.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
