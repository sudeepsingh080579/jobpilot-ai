import { SearchPanel } from "@/components/search-panel";
import { PageHeader } from "@/components/shell";
import { providerStatus } from "@/lib/jobs/providers";
import { requireUser } from "@/server/session";

export default async function SearchPage() {
  await requireUser();
  return (
    <div>
      <PageHeader eyebrow="Discovery" title="Search" lede="Filter the sample market, and live boards when keys are set. Paste a single description or URL if you already have the role." />
      <SearchPanel providers={providerStatus()} />
    </div>
  );
}
