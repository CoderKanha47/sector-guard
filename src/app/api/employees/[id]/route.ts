import { NextResponse } from 'next/server';
import { getEmployeeProfile } from '@/lib/engine/employeeStats';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { hashAccessCode } from '@/lib/passwords';

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

    if (session.role !== 'admin' && session.employeeId !== id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const employee = await getEmployeeProfile(id);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error("Failed to fetch employee profile:", error);
    return NextResponse.json(
      process.env.NODE_ENV === 'production'
        ? { error: "Failed to fetch employee profile." }
        : { error: "Failed to fetch employee profile.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
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
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return NextResponse.json(
      process.env.NODE_ENV === 'production'
        ? { error: "Failed to delete employee." }
        : { error: "Failed to delete employee.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, department, designation, address, tierLimit, accessCode } = body;

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(department && { department }),
        ...(designation && { designation }),
        ...(address && { address }),
        ...(tierLimit && { tierLimit: Number(tierLimit) }),
        ...(typeof accessCode === 'string' && accessCode.trim() && { accessCode: hashAccessCode(accessCode.trim()) })
      }
    });

    return NextResponse.json({ success: true, employee: updated });
  } catch (error) {
    console.error("Failed to update employee:", error);
    return NextResponse.json(
      process.env.NODE_ENV === 'production'
        ? { error: "Failed to update employee." }
        : { error: "Failed to update employee.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}