'use client';

import AppShell, { NavItem } from '@/components/AppShell';

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/students', label: 'Students' },
  { href: '/batches', label: 'Batches' },
  { href: '/staff', label: 'Staff' },
  { href: '/fees', label: 'Fee collection' },
  { href: '/due-fees', label: 'Due fees' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/enquiries', label: 'Enquiries' },
  { href: '/notices', label: 'Notices' },
  { href: '/reports', label: 'Reports' },
  { href: '/search', label: 'Search' },
  { href: '/settings', label: 'Settings' },
];

export default function ManagementShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <AppShell role="management" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
