'use client';

import AppShell, { NavItem } from '@/components/AppShell';

const navItems: NavItem[] = [{ href: '/guardian', label: 'My children', icon: 'family_restroom' }];

export default function GuardianShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <AppShell role="guardian" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
