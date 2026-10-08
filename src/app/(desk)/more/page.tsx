import Link from "next/link";
import {
  BarChart3,
  Bell,
  Building2,
  Compass,
  FileText,
  Handshake,
  Mail,
  Mic,
  PenLine,
  Presentation,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { extensions } from "@/lib/extensions";

const tools = [
  { href: "/strategy", label: "Strategy", detail: "Titles, places, keywords", icon: Compass, tint: "bg-indigo text-white" },
  { href: "/strategy/skills", label: "Skills", detail: "What you already do well", icon: Sparkles, tint: "bg-teal text-white" },
  { href: "/strategy/swot", label: "SWOT", detail: "A plain read of the search", icon: Sparkles, tint: "bg-violet text-white" },
  { href: "/strategy/car", label: "Achievements", detail: "Challenge, action, result", icon: FileText, tint: "bg-coral text-white" },
  { href: "/companies", label: "Companies", detail: "Who you want in", icon: Building2, tint: "bg-sun text-ink" },
  { href: "/analytics", label: "Analytics", detail: "How the funnel is moving", icon: BarChart3, tint: "bg-indigo-deep text-white" },
  { href: "/network", label: "Templates", detail: "The four-note sequence", icon: Users, tint: "bg-teal text-white" },
  { href: "/presence", label: "Presence", detail: "Posts, headline, About", icon: PenLine, tint: "bg-coral text-white" },
  { href: "/interview", label: "Interview", detail: "Questions and a score", icon: Mic, tint: "bg-violet text-white" },
  { href: "/letters", label: "Letters", detail: "Cover notes you can edit", icon: Mail, tint: "bg-indigo text-white" },
  { href: "/resumes", label: "Resumes", detail: "Templates and scores", icon: FileText, tint: "bg-sun text-ink" },
  { href: "/search", label: "Search", detail: "Sample market and paste-in", icon: Search, tint: "bg-teal text-white" },
  { href: "/pitch", label: "Pitch decks", detail: "Slides you can print", icon: Presentation, tint: "bg-violet text-white" },
  { href: "/negotiate", label: "Full negotiation", detail: "Script and role-play", icon: Handshake, tint: "bg-coral text-white" },
  { href: "/reminders", label: "Reminders", detail: "Follow-ups and push", icon: Bell, tint: "bg-sun text-ink" },
  { href: "/settings", label: "Settings", detail: "Your profile", icon: Settings, tint: "bg-indigo-deep text-white" },
];

export default function MorePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">More tools</h1>
      <p className="mt-2 text-base text-muted">Everything else, when you want it. The six steps on Home are enough to start.</p>
      <div data-testid="more-tools" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href + tool.label} href={tool.href} className="desk-card flex min-h-36 flex-col justify-between p-4">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tool.tint}`}>
                <Icon className="h-6 w-6" />
              </span>
              <span>
                <span className="mt-4 block font-bold">{tool.label}</span>
                <span className="mt-1 block text-sm text-muted">{tool.detail}</span>
              </span>
            </Link>
          );
        })}
        <div className="desk-card flex min-h-36 flex-col justify-between bg-canvas p-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-line text-muted">
            <Sparkles className="h-6 w-6" />
          </span>
          <span>
            <span className="mt-4 block font-bold">Later</span>
            <span className="mt-1 block text-sm text-muted">
              {extensions.browserExtension.enabled ? "Add-on" : "Add-on, payments, and coaching stay off"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
