export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl bg-white p-6 print:p-0">{children}</div>;
}
