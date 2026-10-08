import { PresenceStudio } from "@/components/rest-ui";
import { PageHeader } from "@/components/shell";
import { prisma } from "@/lib/prisma";
import { weekKey } from "@/lib/utils";
import { requireUser } from "@/server/session";

export default async function PresencePage() {
  const user = await requireUser();
  const posts = await prisma.linkedInPost.findMany({ where: { userId: user.id, weekOf: weekKey() }, orderBy: { createdAt: "asc" } });
  return (
    <div>
      <PageHeader eyebrow="Presence" title="This week’s writing" lede="Three posts, plus a headline and About suggestion from text you paste. Nothing is published from here." />
      <PresenceStudio
        posts={posts.map((post) => ({ id: post.id, theme: post.theme, content: post.content }))}
        pasted={user.pastedProfile}
        headline={user.headlineSuggestion}
        about={user.aboutSuggestion}
      />
    </div>
  );
}
