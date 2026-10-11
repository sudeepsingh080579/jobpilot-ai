import Link from "next/link";
import { brand } from "@/lib/brand";
import { Mark } from "@/components/mark";

export function AuthShell({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <Mark />
        <span className="text-2xl font-bold">{brand.name}</span>
      </Link>
      <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
      {lede ? <p className="mt-2 text-sm text-muted">{lede}</p> : null}
      {children}
    </main>
  );
}

export const primaryButton = "h-14 w-full rounded-full bg-indigo text-base font-bold text-white";
