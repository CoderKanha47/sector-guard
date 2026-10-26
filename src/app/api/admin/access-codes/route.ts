import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        department: true,
        designation: true,
        accessCode: true,
        rating: true,
        tierLimit: true
      },
      orderBy: { id: 'desc' }
    });

    return NextResponse.json({ success: true, employees });
  } catch (error) {
    console.error("Failed to fetch access codes:", error);
    return NextResponse.json(
      process.env.NODE_ENV === 'production'
        ? { error: "Failed to fetch access codes." }
        : { error: "Failed to fetch access codes.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}