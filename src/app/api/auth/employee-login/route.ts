import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth';
import { verifyAccessCode } from '@/lib/passwords';

export async function POST(request: Request) {
  try {
    const { employeeId, accessCode } = await request.json();

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });

    if (!employee || !verifyAccessCode(String(accessCode ?? ''), employee.accessCode)) {
      return NextResponse.json({ error: "Invalid employee ID or access code." }, { status: 401 });
    }

    const token = await createSessionToken({ role: 'employee', employeeId: employee.id });

    const response = NextResponse.json({ success: true, employeeId: employee.id });
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    return response;
  } catch (error) {
    console.error("Employee login failed:", error);
    return NextResponse.json(
      process.env.NODE_ENV === 'production'
        ? { error: "Login failed." }
        : { error: "Login failed.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}