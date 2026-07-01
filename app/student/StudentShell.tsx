'use client';

import AppShell, { NavItem } from '@/components/AppShell';

const navItems: NavItem[] = [{ href: '/student', label: 'My profile' }];

export default function StudentShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <AppShell role="student" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
