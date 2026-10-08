import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-5 py-20">
      <h1 className="font-serif text-4xl">That page is not on the desk</h1>
      <p className="mt-2 text-sm text-muted">The link may be old, or the record belongs to another account.</p>
      <Link className="mt-4 inline-block text-pine" href="/dashboard">
        Back to the desk
      </Link>
    </main>
  );
}
