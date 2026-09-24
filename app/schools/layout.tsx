import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth';
import OwnerSignOutButton from '@/components/OwnerSignOutButton';

export default async function SchoolsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  // Only the platform Owner (superadmin with no school_id) may reach this
  // section — a per-school account should never end up here.
  if (!session || session.role !== 'superadmin' || (session as any).schoolId != null) redirect('/login');

  return (
    <div className="min-h-screen bg-surface">
      <header className="glass-header px-5 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary">apartment</span>
          <div>
            <h1 className="text-[15px] font-semibold text-on-surface leading-tight">SYM Platform</h1>
            <p className="text-[11px] text-on-surface-variant leading-tight">Owner console</p>
          </div>
        </div>
        <OwnerSignOutButton />
      </header>
      <main className="max-w-5xl mx-auto p-5">{children}</main>
    </div>
  );
}
