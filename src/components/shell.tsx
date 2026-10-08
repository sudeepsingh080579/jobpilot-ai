"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  Columns3,
  Compass,
  FileText,
  Handshake,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Mic,
  PenLine,
  Presentation,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Mark } from "@/components/mark";
import { Modal } from "@/components/ui/dialog";

const items = [
  { href: "/dashboard", label: "Desk", icon: LayoutDashboard },
  { href: "/assistant", label: "Assistant", icon: MessageSquare },
  { href: "/strategy", label: "Strategy", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/tracker", label: "Tracker", icon: Columns3 },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/resumes", label: "Resume", icon: FileText },
  { href: "/letters", label: "Letters", icon: Mail },
  { href: "/network", label: "Network", icon: Users },
  { href: "/pitch", label: "Pitch", icon: Presentation },
  { href: "/presence", label: "Presence", icon: PenLine },
  { href: "/interview", label: "Interview", icon: Mic },
  { href: "/negotiate", label: "Negotiate", icon: Handshake },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

function active(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const mobile = [items[0], items[3], items[4], items[1]];
  return (
    <div className="min-h-screen bg-cream md:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-pine-deep text-cream md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5">
          <Mark />
          <span>
            <span className="block font-serif text-xl leading-none">{brand.shortName}</span>
            <span className="text-xs text-cream/70">Senior search desk</span>
          </span>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {items.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm", on ? "bg-white/10 text-white" : "text-cream/75 hover:bg-white/5 hover:text-white")}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-sm">
          <p className="font-medium">{name}</p>
          <p className="text-cream/60">Signed in</p>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-cream/90 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Mark className="h-7 w-7" />
          <span className="font-serif text-lg">{brand.shortName}</span>
        </Link>
        <span className="text-sm text-muted">{name}</span>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper md:hidden">
        {mobile.map((item) => {
          const Icon = item.icon;
          const on = active(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 py-2 text-[11px]", on ? "text-pine" : "text-muted")}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <Modal
          title="The rest of the desk"
          trigger={
            <button className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted" type="button">
              <Settings className="h-4 w-4" />
              More
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-2">
            {items.slice(2).map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg border border-line px-3 py-3 text-sm hover:bg-cream">
                {item.label}
              </Link>
            ))}
          </div>
        </Modal>
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, lede, actions }: { eyebrow?: string; title: string; lede?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-[0.16em] text-brass">{eyebrow}</p> : null}
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">{title}</h1>
        {lede ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{lede}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="desk-card px-5 py-8 text-center">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
