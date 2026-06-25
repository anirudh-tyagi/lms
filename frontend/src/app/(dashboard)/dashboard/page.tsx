'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ROLE_REDIRECT: Record<string, string> = {
  sales: '/dashboard/sales',
  sanction: '/dashboard/sanction',
  disbursement: '/dashboard/disbursement',
  collection: '/dashboard/collection',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      const dest = ROLE_REDIRECT[user.role];
      if (dest) router.replace(dest);
    }
  }, [user, router]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
      <p className="text-sm text-gray-500 mt-1">Select a module from the sidebar.</p>
    </div>
  );
}
