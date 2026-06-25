import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths accessible without a token
const PUBLIC_PATHS = ['/login', '/register'];

// Dashboard paths allowed per role
const ROLE_DASHBOARD: Record<string, string> = {
  admin: '/dashboard',
  sales: '/dashboard/sales',
  sanction: '/dashboard/sanction',
  disbursement: '/dashboard/disbursement',
  collection: '/dashboard/collection',
};

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Read token from cookie (set during login for SSR-compatible guard)
  const token = request.cookies.get('token')?.value;

  // No token → redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = parseJwtPayload(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = payload.role as string;

  // Borrowers cannot access /dashboard
  if (pathname.startsWith('/dashboard') && role === 'borrower') {
    return NextResponse.redirect(new URL('/personal-details', request.url));
  }

  // Non-borrowers cannot access borrower portal
  if (
    (pathname.startsWith('/personal-details') ||
      pathname.startsWith('/upload') ||
      pathname.startsWith('/loan-config') ||
      pathname.startsWith('/status')) &&
    role !== 'borrower'
  ) {
    const dest = ROLE_DASHBOARD[role] ?? '/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Role-specific dashboard guard (non-admin)
  if (role !== 'admin' && role !== 'borrower') {
    const allowed = ROLE_DASHBOARD[role];
    // Block access to sibling dashboard sections
    const siblingPaths = Object.values(ROLE_DASHBOARD).filter(
      (p) => p !== '/dashboard' && p !== allowed
    );
    if (siblingPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL(allowed ?? '/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
