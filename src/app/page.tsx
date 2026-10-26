import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SectorGuardDashboard from '@/components/SectorGuardDashboard';

export default async function Page() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  let userName = 'Admin';
  let employeeId: string | undefined;

  if (session.role === 'employee' && session.employeeId) {
    employeeId = session.employeeId;
    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: { name: true }
    });
    userName = employee?.name ?? 'Employee';
  }

  return (
    <SectorGuardDashboard
      role={session.role}
      userName={userName}
      employeeId={employeeId}
    />
  );
}
