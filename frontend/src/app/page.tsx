'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const ROLE_REDIRECT: Record<string, string> = {
  borrower: '/personal-details',
  admin: '/dashboard',
  sales: '/dashboard/sales',
  sanction: '/dashboard/sanction',
  disbursement: '/dashboard/disbursement',
  collection: '/dashboard/collection',
};

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace(ROLE_REDIRECT[user.role] ?? '/login');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return null;
}
