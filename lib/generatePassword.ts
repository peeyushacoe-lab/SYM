// Generates a starter password from a person's first name plus a short
// random suffix, e.g. "Rahul" -> "Rahul482x". Meant to be easy for the
// person to remember on first login and changeable afterwards (Settings ->
// My account) — not a long-term secure password by itself.
export function generatePassword(fullName: string): string {
  const firstName = (fullName || 'User').trim().split(/\s+/)[0].replace(/[^a-zA-Z]/g, '') || 'User';
  const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const suffix = Math.random().toString(36).slice(2, 6); // 4 random alphanumeric chars
  return `${capitalized}${suffix}`;
}
