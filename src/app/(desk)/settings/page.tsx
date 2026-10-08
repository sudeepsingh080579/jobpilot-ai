import { SettingsForm } from "@/components/rest-ui";
import { PageHeader } from "@/components/shell";
import { aiMode } from "@/lib/ai";
import { providerStatus } from "@/lib/jobs/providers";
import { requireUser } from "@/server/session";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" lede="The desk is yours. Change the profile the suggestions lean on." />
      <SettingsForm
        mode={aiMode()}
        providers={providerStatus()}
        profile={{
          name: user.name,
          headline: user.headline,
          location: user.location,
          yearsExperience: user.yearsExperience,
          currentTitle: user.currentTitle,
          seniority: user.seniority,
          targetCompensation: user.targetCompensation,
          timezone: user.timezone,
          email: user.email,
        }}
      />
    </div>
  );
}
