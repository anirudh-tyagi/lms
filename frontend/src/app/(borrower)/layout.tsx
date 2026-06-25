'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const STEPS = [
  { label: 'Eligibility', href: '/personal-details', step: 1 },
  { label: 'Salary Slip', href: '/upload', step: 2 },
  { label: 'Loan Details', href: '/loan-config', step: 3 },
  { label: 'Status', href: '/status', step: 4 },
];

export default function BorrowerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const currentStep = STEPS.findIndex((s) => pathname.startsWith(s.href));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-brand-600 text-lg">LoanMS</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Step indicator */}
      <div className="max-w-2xl mx-auto pt-8 px-4">
        <div className="flex items-center mb-8">
          {STEPS.map((s, idx) => {
            const isActive = pathname.startsWith(s.href);
            const isDone = currentStep > idx;
            return (
              <div key={s.href} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors
                      ${isActive ? 'bg-brand-600 border-brand-600 text-white' : isDone ? 'bg-brand-100 border-brand-400 text-brand-700' : 'bg-white border-gray-300 text-gray-400'}`}
                  >
                    {s.step}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${isActive ? 'text-brand-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 ${isDone ? 'bg-brand-400' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pb-12">{children}</main>
    </div>
  );
}
