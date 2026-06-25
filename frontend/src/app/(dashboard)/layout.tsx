'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types';

const ALL_MODULES = [
  { href: '/dashboard/sales', label: 'Sales', role: 'sales' as Role, icon: '👥' },
  { href: '/dashboard/sanction', label: 'Sanction', role: 'sanction' as Role, icon: '📋' },
  { href: '/dashboard/disbursement', label: 'Disbursement', role: 'disbursement' as Role, icon: '💸' },
  { href: '/dashboard/collection', label: 'Collection', role: 'collection' as Role, icon: '💰' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const visibleModules = ALL_MODULES.filter(
    (m) => user?.role === 'admin' || user?.role === m.role
  );

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200">
          <span className="font-bold text-brand-600 text-lg">LoanMS</span>
          <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role} Dashboard</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleModules.map((m) => {
            const active = pathname.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition
                  ${active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <span>{m.icon}</span>
                {m.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 truncate mb-2">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
