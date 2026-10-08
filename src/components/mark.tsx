export function Mark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="10" fill="#4f46e5" />
      <path d="M9 19.5 16 11l7 8.5" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23.5" cy="9.5" r="3.2" fill="#f5c400" />
    </svg>
  );
}
