'use client';

import { useEffect, useState } from 'react';
import AppShell, { NavItem } from '@/components/AppShell';

const allNavItems: (NavItem & { moduleKey?: string })[] = [
  { href: '/student', label: 'Overview', icon: 'dashboard' },
  { href: '/student/profile', label: 'My profile', icon: 'person' },
  { href: '/student/attendance', label: 'Attendance', icon: 'event_available', moduleKey: 'attendance' },
  { href: '/student/fees', label: 'Fees & payments', icon: 'account_balance_wallet', moduleKey: 'fees' },
  { href: '/student/results', label: 'Results', icon: 'grade', moduleKey: 'results' },
  { href: '/student/homework', label: 'Homework', icon: 'assignment', moduleKey: 'homework' },
  { href: '/student/timetable', label: 'Timetable', icon: 'calendar_month', moduleKey: 'timetable' },
  { href: '/student/requests', label: 'Leave & queries', icon: 'forum', moduleKey: 'requests' },
];

export default function StudentShell({ name, children }: { name: string; children: React.ReactNode }) {
  const [navItems, setNavItems] = useState<NavItem[]>(allNavItems);

  useEffect(() => {
    fetch('/api/role-permissions/mine')
      .then((r) => r.json())
      .then((d) => {
        const perms = d.permissions || {};
        setNavItems(
          allNavItems.filter((item) => !item.moduleKey || perms[item.moduleKey]?.can_view !== false)
        );
      })
      .catch(() => setNavItems(allNavItems));
  }, []);

  return (
    <AppShell role="student" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
