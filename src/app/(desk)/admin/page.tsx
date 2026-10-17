import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell";
import { isAdmin } from "@/lib/admin";
import { entitlementFor } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export default async function AdminPage() {
  const me = await requireUser();
  if (!isAdmin(me.email)) notFound();

  const [users, totalUsers, subs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, email: true, name: true, createdAt: true, emailVerified: true, trialEndsAt: true, subscription: true },
    }),
    prisma.user.count(),
    prisma.subscription.findMany({ where: { status: { in: ["active", "trialing", "past_due"] } } }),
  ]);
  const mrrByCurrency = new Map<string, number>();
  for (const sub of subs) mrrByCurrency.set(sub.currency, (mrrByCurrency.get(sub.currency) ?? 0) + sub.mrrCents);
  const monthly = subs.filter((s) => s.plan === "pro_monthly").length;
  const annual = subs.filter((s) => s.plan === "pro_annual").length;
  const pastDue = subs.filter((s) => s.status === "past_due").length;

  return (
    <div data-testid="admin-page">
      <a href="/admin/payments" className="mb-3 inline-block font-semibold underline" data-testid="admin-payments-link">Review UPI payments →</a>
      <PageHeader eyebrow="Admin" title="Business overview" lede="Read-only. Manage refunds and subscriptions in the Stripe Dashboard." />
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["MRR", [...mrrByCurrency].map(([c, v]) => money(v, c)).join(" + ") || "$0.00"],
          ["Users", String(totalUsers)],
          ["Pro monthly / annual", `${monthly} / ${annual}`],
          ["Past due", String(pastDue)],
        ].map(([label, value]) => (
          <div key={label} className="desk-card p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="desk-card mt-6 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-mist">
            <tr><th className="p-3">User</th><th className="p-3">Joined</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Verified</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const ent = entitlementFor({ trialEndsAt: u.trialEndsAt, subscription: u.subscription });
              return (
                <tr key={u.id} className="border-t border-line">
                  <td className="p-3"><div className="font-semibold">{u.name}</div><div className="text-muted">{u.email}</div></td>
                  <td className="p-3">{u.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="p-3">{ent.plan === "pro" ? u.subscription?.plan || "pro" : ent.plan}</td>
                  <td className="p-3">{u.subscription?.status ?? "-"}{u.subscription?.cancelAtPeriodEnd ? " (cancelling)" : ""}</td>
                  <td className="p-3">{u.emailVerified ? "yes" : "no"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">Showing the newest 100 users. MRR counts annual plans as 1/12 per month.</p>
    </div>
  );
}
