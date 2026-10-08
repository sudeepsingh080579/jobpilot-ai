import { AppShell } from "@/components/shell";
import { requireUser } from "@/server/session";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell name={user.name}>{children}</AppShell>;
}
