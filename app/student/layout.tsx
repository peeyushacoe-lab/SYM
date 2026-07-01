import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth';
import StudentShell from './StudentShell';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== 'student') redirect('/login');

  return <StudentShell name={session.name}>{children}</StudentShell>;
}
