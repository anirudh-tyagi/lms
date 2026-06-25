'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { LoanApplication } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FileText, CalendarDays, Percent, IndianRupee, Clock, Wallet, Banknote, HelpCircle, ArrowRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  sanctioned: 'bg-blue-100 text-blue-800 border-blue-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  disbursed: 'bg-purple-100 text-purple-800 border-purple-200',
  closed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function StatusPage() {
  const [loan, setLoan] = useState<LoanApplication | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get('/borrower/application')
      .then((res) => {
        setLoan(res.data.loan);
        setTotalPaid(res.data.totalPaid ?? 0);
        setOutstanding(res.data.outstanding ?? res.data.loan.totalRepayment);
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Fetching loan status...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-10 text-center max-w-lg mx-auto shadow-xl shadow-slate-900/5"
      >
        <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <HelpCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Application Found</h2>
        <p className="text-slate-500 mb-8">You haven&apos;t applied for a loan yet. Please complete the previous steps to submit your application.</p>
      </motion.div>
    );
  }

  if (!loan) return null;

  const progressPercentage = loan.status === 'closed' ? 100 : Math.min(100, (totalPaid / loan.totalRepayment) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl p-8 sm:p-10 shadow-xl shadow-brand-900/5 space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Application Status</h2>
          <p className="text-sm text-slate-500">Application ID: <span className="font-mono">{loan._id.slice(-8).toUpperCase()}</span></p>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider border ${STATUS_COLORS[loan.status] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
          {loan.status}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <IndianRupee className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Loan Amount</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(loan.loanAmount)}</p>
        </div>
        
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <CalendarDays className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Tenure</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{loan.tenure} <span className="text-sm font-medium text-slate-500 lowercase">days</span></p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Percent className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Interest Rate</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{loan.interestRate}% <span className="text-sm font-medium text-slate-500 lowercase">p.a.</span></p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Simple Interest</span>
          </div>
          <p className="text-lg font-semibold text-slate-700">{formatCurrency(loan.simpleInterest)}</p>
        </div>

        <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100 md:col-span-2">
          <div className="flex items-center gap-2 text-brand-600 mb-2">
            <Banknote className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Repayment</span>
          </div>
          <p className="text-2xl font-black text-brand-700">{formatCurrency(loan.totalRepayment)}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Applied On</span>
          </div>
          <p className="text-sm font-semibold text-slate-700">{formatDate(loan.createdAt)}</p>
        </div>

        {loan.disbursedAt && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Disbursed On</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">{formatDate(loan.disbursedAt)}</p>
          </div>
        )}
      </div>

      {loan.status === 'rejected' && loan.rejectionReason && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-red-700 mb-1">Reason for Rejection</p>
          <p className="text-sm text-red-600 font-medium">{loan.rejectionReason}</p>
        </div>
      )}

      {(loan.status === 'disbursed' || loan.status === 'closed') && (
        <div className="bg-slate-800 text-white rounded-3xl p-6 sm:p-8 mt-6 relative overflow-hidden">
          {/* Decorative blur */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
          
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-brand-400" />
            Repayment Progress
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Outstanding</p>
                <p className="text-2xl font-bold text-orange-400">{formatCurrency(outstanding)}</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                <span>0%</span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden backdrop-blur-sm border border-slate-600">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-gradient-to-r from-brand-500 to-emerald-400 h-full rounded-full"
                />
              </div>
            </div>
            
            {loan.status === 'disbursed' && outstanding > 0 && (
              <button className="w-full bg-white text-slate-900 py-3.5 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors mt-4 flex items-center justify-center gap-2 group">
                Make a Payment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
