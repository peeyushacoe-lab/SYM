import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, homeForRole, Role } from '@/lib/auth';

const MANAGEMENT_PREFIXES = [
  '/dashboard',
  '/students',
  '/batches',
  '/staff',
  '/fees',
  '/due-fees',
  '/expenses',
  '/enquiries',
  '/reports',
  '/search',
  '/settings',
  '/notices',
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

function roleForPath(pathname: string): Role | null {
  if (matchesPrefix(pathname, '/teacher')) return 'teacher';
  if (matchesPrefix(pathname, '/guardian')) return 'guardian';
  if (matchesPrefix(pathname, '/student')) return 'student';
  if (MANAGEMENT_PREFIXES.some((p) => matchesPrefix(pathname, p))) return 'management';
  return null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);
  const requiredRole = roleForPath(pathname);

  if (pathname === '/') {
    if (session) return NextResponse.redirect(new URL(homeForRole[session.role], req.url));
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (requiredRole && session.role !== requiredRole) {
    return NextResponse.redirect(new URL(homeForRole[session.role], req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.png|.*\\.svg).*)'],
};
