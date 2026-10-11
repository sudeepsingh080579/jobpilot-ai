import { auth } from "@/auth";
import { brand } from "@/lib/brand";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

export const LEGAL_ENTITY = process.env.LEGAL_ENTITY_NAME || "[Your Company Legal Name]";
export const LEGAL_CONTACT = process.env.SUPPORT_EMAIL || "[support@your-domain.com]";
export const LEGAL_UPDATED = "[Effective date]";

export async function LegalPage({ title, sections }: { title: string; sections: { heading: string; body: string[] }[] }) {
  const session = await auth();
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader signedIn={Boolean(session?.user)} />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="rounded-2xl border-2 border-coral bg-coral-soft px-4 py-3 text-sm font-semibold text-ink" data-testid="legal-template-notice">
          TEMPLATE, NOT LEGAL ADVICE. This text is a starting point and must be reviewed and adapted by a qualified lawyer for your company and every market you sell into before launch.
        </p>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">{brand.name} · {LEGAL_ENTITY} · Last updated {LEGAL_UPDATED}</p>
        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-bold">{section.heading}</h2>
              {section.body.map((p) => (
                <p key={p.slice(0, 40)} className="mt-2 leading-7 text-muted">{p}</p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
