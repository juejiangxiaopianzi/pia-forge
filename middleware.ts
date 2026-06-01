import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'pia_forge_dev_only_change_in_prod',
);

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
];

const PUBLIC_PREFIXES = [
  '/api/v1/', // REST API · 用 Bearer Token 鉴权 · 不走 cookie
  '/api/mcp', // MCP · 用 Bearer Token 鉴权
  '/_next/', // Next 静态资源
  '/favicon',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 公开路径直接放行
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // 检查 cookie session
  const cookie = req.cookies.get('pia_session')?.value;
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(cookie, SECRET);
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('pia_session');
    return resp;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
