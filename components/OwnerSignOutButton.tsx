'use client';

export default function OwnerSignOutButton() {
  return (
    <button
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      }}
      className="text-xs font-medium text-on-surface-variant hover:text-danger transition-colors"
    >
      Sign out
    </button>
  );
}
