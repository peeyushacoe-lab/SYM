import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth';
import StaffAdminShell from './StaffAdminShell';

export default async function StaffAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== 'staff_admin') redirect('/login');

  return <StaffAdminShell name={session.name}>{children}</StaffAdminShell>;
}
