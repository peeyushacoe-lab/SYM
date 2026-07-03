'use client';

import AppShell, { NavItem } from '@/components/AppShell';

const navItems: NavItem[] = [
  { href: '/teacher', label: 'Overview', icon: 'dashboard' },
  { href: '/teacher/batches', label: 'My batches', icon: 'book' },
  { href: '/teacher/exams', label: 'Exams & marks', icon: 'grade' },
  { href: '/teacher/timetable', label: 'Timetable', icon: 'calendar_month' },
  { href: '/teacher/requests', label: 'Leave requests', icon: 'forum' },
];

export default function TeacherShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <AppShell role="teacher" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
