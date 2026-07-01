'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
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
  const activeItem = navItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
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

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-navBg flex-shrink-0 hidden md:flex md:flex-col">
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-2.5">
          <img src="/logo-64.png" alt="SYM" className="w-9 h-9 object-contain flex-shrink-0" />
          <div>
            <div className="text-white font-semibold text-base leading-tight">SYM</div>
            <div className="text-textLight text-[11px]">Shiksha Yogi ERP</div>
          </div>
        </div>
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition ${
                  active ? 'bg-navActive text-white' : 'text-textLight hover:bg-navActive/60 hover:text-white'
                }`}
              >
                {item.icon || <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-primary' : 'bg-textLight'}`} />}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-textLight hover:bg-navActive/60 hover:text-white transition"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-border px-5 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="text-[17px] font-medium text-text">{title}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[13px] font-medium text-text">{name}</div>
              <div className="text-[11px] text-textSecondary">{roleLabel[role] || role}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
              {initials || '?'}
            </div>
          </div>
        </header>
        <div className="p-5">{children}</div>
      </main>
    </div>
  );
}
