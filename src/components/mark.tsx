export function Mark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#1f4d45" />
      <path d="M8 22.5 16 8.5l8 14" fill="none" stroke="#f3efe6" strokeWidth="1.8" />
      <circle cx="16" cy="15" r="2.1" fill="#b8613a" />
    </svg>
  );
}
