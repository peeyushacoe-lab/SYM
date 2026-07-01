import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth';
import TeacherShell from './TeacherShell';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== 'teacher') redirect('/login');

  return <TeacherShell name={session.name}>{children}</TeacherShell>;
}
