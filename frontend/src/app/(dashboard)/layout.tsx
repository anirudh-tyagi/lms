'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types';
import { motion } from 'framer-motion';
import { 
  Users, ClipboardCheck, Wallet, FileBarChart, 
  LogOut, ShieldCheck, UserCircle2 
} from 'lucide-react';

const ALL_MODULES = [
  { href: '/dashboard/sales', label: 'Sales Operations', role: 'sales' as Role, icon: Users },
  { href: '/dashboard/sanction', label: 'Sanction Desk', role: 'sanction' as Role, icon: ClipboardCheck },
  { href: '/dashboard/disbursement', label: 'Disbursements', role: 'disbursement' as Role, icon: Wallet },
  { href: '/dashboard/collection', label: 'Collections', role: 'collection' as Role, icon: FileBarChart },
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
    <div className="min-h-screen flex bg-slate-50">
      {/* Premium Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20">
        <div className="px-6 py-8 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1 text-white">
            <ShieldCheck className="w-7 h-7 text-brand-400" />
            <span className="font-bold text-xl tracking-tight">LMS</span>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-2">{user?.role} Portal</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {visibleModules.map((m) => {
            const active = pathname.startsWith(m.href);
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
                  ${active ? 'text-white bg-brand-600 shadow-lg shadow-brand-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'}`} />
                <span>{m.label}</span>
                {active && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute inset-0 bg-brand-600 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 m-4 bg-slate-850 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-700 p-2 rounded-full text-slate-300">
              <UserCircle2 className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm text-white font-medium truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full justify-center px-4 py-2 text-sm text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg font-medium transition-colors border border-transparent hover:border-red-500/30"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 glass z-10 px-8 flex items-center justify-between sticky top-0">
          <h2 className="text-lg font-semibold text-slate-800">
            {visibleModules.find(m => pathname.startsWith(m.href))?.label || 'Dashboard'}
          </h2>
          <div className="text-sm font-medium text-slate-500">
            System Status: <span className="text-emerald-500 ml-1">● Online</span>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-8 bg-slate-50/50">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
