import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth';
import GuardianShell from './GuardianShell';

export default async function GuardianLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== 'guardian') redirect('/login');

  return <GuardianShell name={session.name}>{children}</GuardianShell>;
}
