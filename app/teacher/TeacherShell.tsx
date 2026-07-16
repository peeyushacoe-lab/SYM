'use client';

import { useEffect, useState } from 'react';
import AppShell, { NavItem } from '@/components/AppShell';

const allNavItems: (NavItem & { moduleKey?: string })[] = [
  { href: '/teacher', label: 'Overview', icon: 'dashboard' },
  { href: '/teacher/batches', label: 'My batches', icon: 'book', moduleKey: 'batches' },
  { href: '/teacher/exams', label: 'Exams & marks', icon: 'grade', moduleKey: 'exams' },
  { href: '/teacher/timetable', label: 'Timetable', icon: 'calendar_month', moduleKey: 'timetable' },
  { href: '/teacher/requests', label: 'Leave requests', icon: 'forum', moduleKey: 'requests' },
];

export default function TeacherShell({ name, children }: { name: string; children: React.ReactNode }) {
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
    <AppShell role="teacher" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
