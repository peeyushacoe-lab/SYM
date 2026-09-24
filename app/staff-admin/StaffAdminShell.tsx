'use client';

import AppShell, { NavItem } from '@/components/AppShell';

const navItems: NavItem[] = [{ href: '/staff-admin', label: 'Staff Attendance', icon: 'event_available' }];

export default function StaffAdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <AppShell role="staff_admin" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
