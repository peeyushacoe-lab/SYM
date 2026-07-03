'use client';

import AppShell, { NavItem } from '@/components/AppShell';

const navItems: NavItem[] = [
  { href: '/student', label: 'Overview', icon: 'dashboard' },
  { href: '/student/profile', label: 'My profile', icon: 'person' },
  { href: '/student/attendance', label: 'Attendance', icon: 'event_available' },
  { href: '/student/fees', label: 'Fees & payments', icon: 'account_balance_wallet' },
  { href: '/student/results', label: 'Results', icon: 'grade' },
  { href: '/student/timetable', label: 'Timetable', icon: 'calendar_month' },
  { href: '/student/requests', label: 'Leave & queries', icon: 'forum' },
];

export default function StudentShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <AppShell role="student" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
