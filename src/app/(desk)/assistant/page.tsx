import { redirect } from "next/navigation";

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const query = await searchParams;
  const job = query.job ? `&job=${encodeURIComponent(query.job)}` : "";
  redirect(`/dashboard?chat=1${job}`);
}
