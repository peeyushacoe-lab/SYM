'use client';

import AppShell, { NavItem } from '@/components/AppShell';

const navItems: NavItem[] = [{ href: '/teacher', label: 'My batches' }];

export default function TeacherShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <AppShell role="teacher" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
