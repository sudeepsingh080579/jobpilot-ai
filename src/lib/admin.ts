export function adminEmails(value = process.env.ADMIN_EMAILS) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email: string | null | undefined, value = process.env.ADMIN_EMAILS) {
  return Boolean(email) && adminEmails(value).includes(String(email).toLowerCase());
}
