export type ResumeContent = {
  name: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  links: string[];
  summary: string;
  skills: { group: string; items: string[] }[];
  experience: {
    company: string;
    title: string;
    location: string;
    start: string;
    end: string;
    bullets: string[];
  }[];
  education: { school: string; credential: string; year: string }[];
  certifications: string[];
};

export const emptyResume = (): ResumeContent => ({
  name: "",
  headline: "",
  location: "",
  email: "",
  phone: "",
  links: [],
  summary: "",
  skills: [],
  experience: [],
  education: [],
  certifications: [],
});

export function resumeToText(content: ResumeContent) {
  const skills = content.skills.flatMap((group) => group.items).join(", ");
  const roles = content.experience
    .map((role) =>
      [`${role.title} — ${role.company} (${role.start}–${role.end})`, ...role.bullets.map((b) => `- ${b}`)].join("\n"),
    )
    .join("\n");
  return [
    content.name,
    content.headline,
    [content.location, content.email, content.phone].filter(Boolean).join(" | "),
    content.links.join(" "),
    content.summary,
    skills,
    roles,
    content.education.map((item) => `${item.credential}, ${item.school}, ${item.year}`).join("\n"),
    content.certifications.join(", "),
  ]
    .filter(Boolean)
    .join("\n");
}
