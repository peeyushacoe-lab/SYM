'use client';

import AppShell, { NavItem } from '@/components/AppShell';

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/students', label: 'Students', icon: 'school' },
  { href: '/courses', label: 'Courses', icon: 'menu_book' },
  { href: '/batches', label: 'Batches', icon: 'book' },
  { href: '/staff', label: 'Staff', icon: 'badge' },
  { href: '/payroll', label: 'Payroll', icon: 'payments' },
  { href: '/alumni', label: 'Alumni', icon: 'diversity_3' },
  { href: '/fees', label: 'Fee collection', icon: 'account_balance_wallet' },
  { href: '/due-fees', label: 'Due fees', icon: 'schedule' },
  { href: '/expenses', label: 'Expenses', icon: 'receipt_long' },
  { href: '/enquiries', label: 'Enquiries', icon: 'contact_support' },
  { href: '/exams', label: 'Exams & marks', icon: 'grade' },
  { href: '/homework', label: 'Homework', icon: 'assignment' },
  { href: '/lesson-plans', label: 'Lesson plans', icon: 'menu_book' },
  { href: '/timetable', label: 'Timetable', icon: 'calendar_month' },
  { href: '/academic-calendar', label: 'Academic calendar', icon: 'event' },
  { href: '/library', label: 'Library', icon: 'local_library' },
  { href: '/inventory', label: 'Inventory', icon: 'inventory_2' },
  { href: '/hostel', label: 'Hostel', icon: 'apartment' },
  { href: '/transport', label: 'Transport', icon: 'directions_bus' },
  { href: '/visitors', label: 'Visitor log', icon: 'badge' },
  { href: '/requests', label: 'Requests', icon: 'forum' },
  { href: '/notices', label: 'Notices', icon: 'campaign' },
  { href: '/reports', label: 'Reports', icon: 'monitoring' },
  { href: '/performance', label: 'Performance', icon: 'insights' },
  { href: '/search', label: 'Search', icon: 'search' },
  { href: '/branches', label: 'Branches', icon: 'account_tree' },
  { href: '/roles', label: 'Roles & Permissions', icon: 'admin_panel_settings' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

export default function ManagementShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <AppShell role="management" name={name} navItems={navItems}>
      {children}
    </AppShell>
  );
}
