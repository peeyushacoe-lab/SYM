'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import NotificationBell from './NotificationBell';

export interface NavItem {
  href: string;
  label: string;
  icon?: string; // Material Symbols name
}

export default function AppShell({
  role,
  name,
  navItems,
  children,
}: {
  role: string;
  name: string;
  navItems: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = navItems.reduce<NavItem | undefined>((best, item) => {
    const matches = pathname === item.href || pathname.startsWith(item.href + '/');
    if (!matches) return best;
    if (!best || item.href.length > best.href.length) return item;
    return best;
  }, undefined);
  const title = activeItem?.label || 'Overview';

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleLabel: Record<string, string> = {
    management: 'Management',
    teacher: 'Teacher',
    guardian: 'Guardian',
    student: 'Student',
  };

  const nav = (
    <>
      <div className="flex items-center gap-2.5 px-3 mb-6">
        <img src="/logo-128.png" alt="SYM" className="w-10 h-10 object-contain flex-shrink-0" />
        <div>
          <h1 className="text-on-surface font-semibold text-lg leading-tight tracking-tight">SYM</h1>
          <p className="text-on-surface-variant text-[11px]">Siksha Yogi Management</p>
        </div>
      </div>
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = item.href === activeItem?.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                active
                  ? 'text-tertiary font-bold bg-white/60 border-l-4 border-tertiary translate-x-1 shadow-soft'
                  : 'text-on-surface-variant/80 border-l-4 border-transparent hover:text-on-surface hover:bg-white/40'
              }`}
            >
              {item.icon && (
                <span className={`material-symbols-outlined ${active ? 'filled' : ''}`}>{item.icon}</span>
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-3 border-t border-outline-variant/30">
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center gap-2.5 px-4 py-2 rounded-lg text-[13px] font-medium text-on-surface-variant/80 hover:text-on-surface hover:bg-white/40 transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="w-64 glass-sidebar flex-shrink-0 hidden md:flex md:flex-col py-6 px-3 sticky top-0 h-screen">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 glass-sidebar flex flex-col py-6 px-3 bg-white/95">
            {nav}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="glass-header px-5 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden text-tertiary p-1.5 hover:bg-white/50 rounded-lg transition-all"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="text-[16px] font-semibold text-on-surface">{title}</div>
          </div>
          <div className="flex items-center gap-3">
            {role === 'management' && <NotificationBell />}
            <div className="text-right hidden sm:block">
              <div className="text-[13px] font-medium text-on-surface">{name}</div>
              <div className="text-[11px] text-on-surface-variant">{roleLabel[role] || role}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-tertiary text-white flex items-center justify-center text-xs font-semibold shadow-soft border border-white">
              {initials || '?'}
            </div>
          </div>
        </header>
        <div className="p-5 max-w-7xl w-full mx-auto flex-1">{children}</div>
      </main>
    </div>
  );
}
