'use client';

import AppShell, { NavItem } from '@/components/AppShell';

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/students', label: 'Students', icon: 'school' },
  { href: '/courses', label: 'Courses', icon: 'menu_book' },
  { href: '/batches', label: 'Batches', icon: 'book' },
  { href: '/staff', label: 'Staff', icon: 'badge' },
  { href: '/fees', label: 'Fee collection', icon: 'account_balance_wallet' },
  { href: '/due-fees', label: 'Due fees', icon: 'schedule' },
  { href: '/expenses', label: 'Expenses', icon: 'receipt_long' },
  { href: '/enquiries', label: 'Enquiries', icon: 'contact_support' },
  { href: '/notices', label: 'Notices', icon: 'campaign' },
  { href: '/reports', label: 'Reports', icon: 'monitoring' },
  { href: '/search', label: 'Search', icon: 'search' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

export default function ManagementShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <AppShell role="management" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
