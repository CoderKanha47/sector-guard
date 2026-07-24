import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import SectorGuardDashboard from '@/components/SectorGuardDashboard';

export default async function Page() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return <SectorGuardDashboard />;
}