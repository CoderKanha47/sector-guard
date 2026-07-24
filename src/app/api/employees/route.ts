import { NextResponse } from 'next/server';
import { getAllEmployeesSummary } from '@/lib/engine/employeeStats';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }
  try {
    const employees = await getAllEmployeesSummary();
    return NextResponse.json({ success: true, employees });
  } catch (error: any) {
    console.error("Failed to fetch employee list:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees.", details: error.message },
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
    const { id, name, department, designation, address, tierLimit } = body;

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

    const employee = await prisma.employee.create({
      data: {
        id,
        name,
        department,
        designation: designation || "Not Specified",
        address: address || "Not Provided",
        tierLimit: Number(tierLimit)
      }
    });

    return NextResponse.json({ success: true, employee });
  } catch (error: any) {
    console.error("Failed to create employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee.", details: error.message },
      { status: 500 }
    );
  }
}