'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { ShieldCheck, LogOut, Check, UserCircle2 } from 'lucide-react';

const STEPS = [
  { label: 'Eligibility', href: '/personal-details', step: 1 },
  { label: 'Upload Docs', href: '/upload', step: 2 },
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top nav */}
      <nav className="glass border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 text-brand-700">
          <ShieldCheck className="w-6 h-6" />
          <span className="font-bold text-xl tracking-tight">LMS</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 py-1.5 px-3 rounded-full">
            <UserCircle2 className="w-4 h-4" />
            <span className="font-medium truncate max-w-[150px]">{user?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-white hover:bg-red-500 px-3 py-1.5 rounded-full font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-10">
        {/* Step indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            {/* Background line */}
            <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-200 -z-10" />
            
            {/* Active Line */}
            {currentStep > 0 && (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute top-5 left-0 h-0.5 bg-brand-500 -z-10" 
              />
            )}

            {STEPS.map((s, idx) => {
              const isActive = pathname.startsWith(s.href);
              const isDone = currentStep > idx;
              
              return (
                <div key={s.href} className="flex flex-col items-center relative bg-slate-50 px-2 sm:px-4">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      backgroundColor: isActive ? '#4f46e5' : isDone ? '#e0e7ff' : '#ffffff',
                      borderColor: isActive ? '#4f46e5' : isDone ? '#818cf8' : '#cbd5e1',
                      color: isActive ? '#ffffff' : isDone ? '#4f46e5' : '#94a3b8'
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 shadow-sm"
                  >
                    {isDone ? <Check className="w-5 h-5" /> : s.step}
                  </motion.div>
                  <span 
                    className={`text-xs sm:text-sm mt-3 font-medium transition-colors absolute top-12 whitespace-nowrap
                    ${isActive ? 'text-brand-700 font-bold' : isDone ? 'text-slate-700' : 'text-slate-400'}`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <motion.main 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-16"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
