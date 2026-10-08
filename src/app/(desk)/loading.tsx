export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded bg-line" />
      <div className="h-28 animate-pulse rounded-2xl bg-paper" />
      <div className="h-28 animate-pulse rounded-2xl bg-paper" />
    </div>
  );
}
