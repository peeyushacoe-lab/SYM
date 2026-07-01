'use client';

import AppShell, { NavItem } from '@/components/AppShell';

const navItems: NavItem[] = [{ href: '/guardian', label: 'My children' }];

export default function GuardianShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <AppShell role="guardian" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
