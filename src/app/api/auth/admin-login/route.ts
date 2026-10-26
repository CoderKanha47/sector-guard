import { NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth';
import { safeEqual } from '@/lib/passwords';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[ADMIN LOGIN] Request body:', body);
    const { password } = body;

    if (!safeEqual(String(password ?? ''), String(process.env.ADMIN_PASSWORD ?? ''))) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const token = await createSessionToken({ role: 'admin' });
    console.log('[ADMIN LOGIN] Token created:', token.substring(0, 20) + '...');

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    console.log('[ADMIN LOGIN] Cookie set');
    return response;
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json(
      process.env.NODE_ENV === 'production'
        ? { error: "Login failed." }
        : { error: "Login failed.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}