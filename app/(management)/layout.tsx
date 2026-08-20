import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth';
import ManagementShell from './ManagementShell';

export default async function ManagementLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || !['management', 'superadmin'].includes(session.role)) redirect('/login');

  return <ManagementShell name={session.name}>{children}</ManagementShell>;
}
