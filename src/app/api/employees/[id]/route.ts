import { NextResponse } from 'next/server';
import { getEmployeeProfile } from '@/lib/engine/employeeStats';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(

  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const employee = await getEmployeeProfile(id);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, employee });
  } catch (error: any) {
    console.error("Failed to fetch employee profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee profile.", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 }
      );
    }

    await prisma.employee.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("Failed to delete employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee.", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, department, designation, address, tierLimit } = body;

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(department && { department }),
        ...(designation && { designation }),
        ...(address && { address }),
        ...(tierLimit && { tierLimit: Number(tierLimit) })
      }
    });

    return NextResponse.json({ success: true, employee: updated });
  } catch (error: any) {
    console.error("Failed to update employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee.", details: error.message },
      { status: 500 }
    );
  }
}