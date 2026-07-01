import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth';
import ManagementShell from './ManagementShell';

export default async function ManagementLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== 'management') redirect('/login');

  return <ManagementShell name={session.name}>{children}</ManagementShell>;
}
