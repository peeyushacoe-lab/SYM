import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { signSession, COOKIE_NAME, homeForRole, Role } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const db = getDb();
  const user = (await db
    .prepare('SELECT * FROM users WHERE username = ? AND active = 1')
    .get(username)) as any;

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  const sessionUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as Role,
  };
  const token = await signSession(sessionUser);

  const res = NextResponse.json({ user: sessionUser, redirect: homeForRole[sessionUser.role] });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
