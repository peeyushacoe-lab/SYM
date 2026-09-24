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
  '/subjects',
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

function roleForPath(pathname: string): Role | null {
  if (matchesPrefix(pathname, '/schools')) return 'superadmin';
  if (matchesPrefix(pathname, '/teacher')) return 'teacher';
  if (matchesPrefix(pathname, '/guardian')) return 'guardian';
  if (matchesPrefix(pathname, '/student')) return 'student';
  if (matchesPrefix(pathname, '/staff-admin')) return 'staff_admin';
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

  // The platform Owner (role='superadmin', schoolId=null) manages /schools
  // only — it does NOT get a blanket pass into a real school's /dashboard,
  // /students etc., since it has no school_id to scope that data to. Only a
  // per-school superadmin (schoolId set) would inherit management access,
  // and the current account-creation flow never creates one of those anymore.
  const roleOk =
    !requiredRole ||
    session.role === requiredRole ||
    (requiredRole === 'management' && session.role === 'superadmin' && (session as any).schoolId != null);
  if (!roleOk) {
    return NextResponse.redirect(new URL(homeForRole[session.role], req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.png|.*\\.svg).*)'],
};
