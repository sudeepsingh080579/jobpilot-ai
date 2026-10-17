import Link from "next/link";
import { brand } from "@/lib/brand";
import { Mark } from "@/components/mark";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
      <Link href="/" className="flex items-center gap-2">
        <Mark />
        <span className="text-lg font-bold">{brand.name}</span>
      </Link>
      <nav className="flex items-center gap-2 text-sm font-semibold">
        <Link href="/pricing" className="rounded-full px-4 py-2 hover:bg-white">Pricing</Link>
        {signedIn ? (
          <Link href="/dashboard" className="rounded-full bg-indigo px-4 py-2 text-white">My desk</Link>
        ) : (
          <>
            <Link href="/login" data-testid="landing-signin" className="rounded-full px-4 py-2 hover:bg-white">Sign in</Link>
            <Link href="/register" className="rounded-full bg-sun px-4 py-2 text-ink">Start free</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {brand.name}</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/pricing">Pricing</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/refund">Refunds</Link>
          <Link href="/support">Support &amp; grievances</Link>
        </nav>
      </div>
    </footer>
  );
}
