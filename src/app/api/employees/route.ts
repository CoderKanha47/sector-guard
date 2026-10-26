import { NextResponse } from 'next/server';
import { getAllEmployeesSummary } from '@/lib/engine/employeeStats';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateAccessCode, hashAccessCode } from '@/lib/passwords';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }
  try {
    const summary = await getAllEmployeesSummary();
    const employees = session.role === 'admin'
      ? summary
      : summary.filter(emp => emp.id === session.employeeId);
    return NextResponse.json({ success: true, employees });
  } catch (error) {
    console.error("Failed to fetch employee list:", error);
    return NextResponse.json(
      process.env.NODE_ENV === 'production'
        ? { error: "Failed to fetch employees." }
        : { error: "Failed to fetch employees.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { id, name, department, designation, address, tierLimit, accessCode } = body;

    if (!id || !name || !department || !tierLimit) {
      return NextResponse.json(
        { error: "id, name, department, and tierLimit are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (existing) {
      return NextResponse.json(
        { error: `Employee with id '${id}' already exists.` },
        { status: 409 }
      );
    }

    const initialAccessCode = typeof accessCode === 'string' && accessCode.trim()
      ? accessCode.trim()
      : generateAccessCode();

    const employee = await prisma.employee.create({
      data: {
        id,
        name,
        department,
        designation: designation || "Not Specified",
        address: address || "Not Provided",
        tierLimit: Number(tierLimit),
        accessCode: hashAccessCode(initialAccessCode)
      }
    });

    return NextResponse.json({ success: true, employee, initialAccessCode });
  } catch (error) {
    console.error("Failed to create employee:", error);
    return NextResponse.json(
      process.env.NODE_ENV === 'production'
        ? { error: "Failed to create employee." }
        : { error: "Failed to create employee.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}