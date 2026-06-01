import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth-session';

export async function POST(req: Request) {
  await clearSession();
  const url = new URL('/login', req.url);
  return NextResponse.redirect(url, 303);
}

export async function GET(req: Request) {
  await clearSession();
  const url = new URL('/login', req.url);
  return NextResponse.redirect(url);
}
