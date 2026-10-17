"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Columns3, Home, LayoutGrid, MessageCircle } from "lucide-react";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Mark } from "@/components/mark";
import { AssistantDock } from "@/components/assistant-dock";
import { UpgradePrompt } from "@/components/upgrade-prompt";

type Message = { id: string; role: string; content: string; rating: number | null };

const links = [
  { href: "/dashboard", label: "Home", icon: Home, key: "home" },
  { href: "/tracker", label: "Jobs", icon: Columns3, key: "jobs" },
  { href: "/more", label: "More", icon: LayoutGrid, key: "more" },
];

function zone(pathname: string) {
  if (pathname === "/dashboard" || pathname.startsWith("/journey")) return "home";
  if (pathname.startsWith("/tracker") || pathname.startsWith("/search") || pathname.startsWith("/hunt")) return "jobs";
  if (
    pathname.startsWith("/more") ||
    pathname.startsWith("/strategy") ||
    pathname.startsWith("/companies") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/network") ||
    pathname.startsWith("/presence") ||
    pathname.startsWith("/interview") ||
    pathname.startsWith("/letters") ||
    pathname.startsWith("/resumes") ||
    pathname.startsWith("/pitch") ||
    pathname.startsWith("/negotiate") ||
    pathname.startsWith("/reminders") ||
    pathname.startsWith("/settings")
  ) {
    return "more";
  }
  return "";
}

export function AppShell({
  name,
  messages,
  jobs,
  planLabel,
  banner,
  children,
}: {
  planLabel?: string;
  banner?: React.ReactNode;
  name: string;
  messages: Message[];
  jobs: { id: string; title: string; company: string }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = zone(pathname);
  const [chatOpen, setChatOpen] = useState(false);
  const first = name.split(" ")[0];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-canvas/90 px-4 py-3 backdrop-blur">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Mark />
          <span className="text-lg font-bold">{brand.shortName}</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((item) => (
            <Link key={item.key} href={item.href} className={cn("rounded-full px-4 py-2 text-sm font-semibold", active === item.key ? "bg-indigo text-white" : "text-ink hover:bg-white")}>
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="flex items-center gap-2 text-sm font-medium text-muted">
          {planLabel ? (
            <Link href="/settings/billing" data-testid="plan-pill" className="rounded-full bg-sun px-3 py-1 text-xs font-bold text-ink">
              {planLabel}
            </Link>
          ) : null}
          {first}
        </span>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-36 md:px-8 md:pb-28">
        {banner}
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-paper md:hidden">
        {links.slice(0, 2).map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.key} href={item.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-xs font-semibold", active === item.key ? "text-indigo" : "text-muted")}>
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button type="button" className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold text-muted" onClick={() => setChatOpen(true)}>
          <MessageCircle className="h-5 w-5" />
          Assistant
        </button>
        <Link href="/more" className={cn("flex flex-col items-center gap-1 py-2.5 text-xs font-semibold", active === "more" ? "text-indigo" : "text-muted")}>
          <LayoutGrid className="h-5 w-5" />
          More
        </Link>
      </nav>
      <UpgradePrompt />
      <AssistantDock open={chatOpen} onOpenChange={setChatOpen} messages={messages} jobs={jobs} />
    </div>
  );
}

export function PageHeader({ eyebrow, title, lede, actions }: { eyebrow?: string; title: string; lede?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow ? <p className="mb-2 inline-flex rounded-full bg-sun-soft px-3 py-1 text-xs font-bold text-ink">{eyebrow}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
          {lede ? <p className="mt-2 max-w-xl text-base leading-7 text-muted">{lede}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="desk-card px-6 py-10 text-center">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-base leading-7 text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
