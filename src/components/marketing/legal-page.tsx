import { auth } from "@/auth";
import { brand } from "@/lib/brand";
import { legalConfig } from "@/lib/legal";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

export type LegalSection = { heading: string; body: string[] };

export async function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  const session = await auth();
  const c = legalConfig();
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader signedIn={Boolean(session?.user)} />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">{brand.name}{c.entity !== brand.name ? ` · operated by ${c.entity}` : ""} · Effective {c.effectiveDate}</p>
        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-bold">{section.heading}</h2>
              {section.body.map((p) => (
                <p key={p.slice(0, 60)} className="mt-2 leading-7 text-muted">{p}</p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
