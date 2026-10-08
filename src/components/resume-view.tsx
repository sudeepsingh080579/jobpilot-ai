import type { ResumeContent } from "@/lib/resume/types";

export function ResumeView({ content, template }: { content: ResumeContent; template: string }) {
  if (template === "atlas") return <Atlas content={content} />;
  if (template === "ledger") return <Ledger content={content} />;
  return <Executive content={content} />;
}

function Header({ content }: { content: ResumeContent }) {
  return (
    <header>
      <h2 className="font-serif text-4xl leading-none">{content.name || "Name"}</h2>
      <p className="mt-2 text-sm text-pine">{content.headline}</p>
      <p className="mt-1 text-xs text-muted">{[content.location, content.email, content.phone, ...content.links].filter(Boolean).join(" · ")}</p>
    </header>
  );
}

function Roles({ content, dense = false }: { content: ResumeContent; dense?: boolean }) {
  return (
    <div className={dense ? "space-y-3" : "space-y-4"}>
      {content.experience.map((role) => (
        <section key={`${role.company}-${role.title}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-medium">{role.title}</h3>
            <p className="text-xs text-muted">{[role.start, role.end].filter(Boolean).join(" – ")}</p>
          </div>
          <p className="text-sm text-pine">{role.company}{role.location ? ` · ${role.location}` : ""}</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-5">
            {role.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Executive({ content }: { content: ResumeContent }) {
  return (
    <article className="bg-white p-6 text-ink shadow-sm">
      <Header content={content} />
      <div className="my-4 h-px bg-pine" />
      <p className="text-sm leading-6">{content.summary}</p>
      <h3 className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-brass">Experience</h3>
      <div className="mt-2">
        <Roles content={content} />
      </div>
      <h3 className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-brass">Skills</h3>
      {content.skills.map((group) => (
        <p key={group.group} className="mt-1 text-sm">
          <span className="font-medium">{group.group}: </span>
          {group.items.join(", ")}
        </p>
      ))}
      <Footer content={content} />
    </article>
  );
}

function Atlas({ content }: { content: ResumeContent }) {
  return (
    <article className="grid bg-white text-ink shadow-sm md:grid-cols-[14rem_1fr]">
      <aside className="bg-pine-deep p-5 text-cream">
        <h2 className="font-serif text-3xl leading-none">{content.name || "Name"}</h2>
        <p className="mt-3 text-xs leading-5 text-cream/80">{[content.location, content.email, content.phone].filter(Boolean).join("\n")}</p>
        <div className="mt-6 space-y-3">
          {content.skills.map((group) => (
            <div key={group.group}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-cream/60">{group.group}</p>
              <p className="mt-1 text-sm leading-5">{group.items.join(" · ")}</p>
            </div>
          ))}
        </div>
      </aside>
      <div className="p-6">
        <p className="text-sm text-pine">{content.headline}</p>
        <p className="mt-3 text-sm leading-6">{content.summary}</p>
        <div className="mt-4">
          <Roles content={content} />
        </div>
        <Footer content={content} />
      </div>
    </article>
  );
}

function Ledger({ content }: { content: ResumeContent }) {
  return (
    <article className="bg-white p-6 font-sans text-[13px] leading-5 text-ink">
      <h2 className="text-xl font-semibold">{content.name}</h2>
      <p>{content.headline}</p>
      <p className="text-muted">{[content.location, content.email, content.phone].filter(Boolean).join(" | ")}</p>
      <p className="mt-3">{content.summary}</p>
      <h3 className="mt-4 border-b border-ink font-semibold">Experience</h3>
      <Roles content={content} dense />
      <h3 className="mt-4 border-b border-ink font-semibold">Skills</h3>
      <p className="mt-1">{content.skills.flatMap((group) => group.items).join(", ")}</p>
      <Footer content={content} />
    </article>
  );
}

function Footer({ content }: { content: ResumeContent }) {
  if (!content.education.length && !content.certifications.length) return null;
  return (
    <div className="mt-4 text-sm">
      {content.education.map((item) => (
        <p key={item.school}>{item.credential} · {item.year}</p>
      ))}
      {content.certifications.length ? <p className="text-muted">{content.certifications.join(" · ")}</p> : null}
    </div>
  );
}
