'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { LoanApplication } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  sanctioned: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  disbursed: 'bg-purple-100 text-purple-800',
  closed: 'bg-green-100 text-green-800',
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

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;
  if (notFound) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-gray-500">You haven&apos;t applied for a loan yet.</p>
      </div>
    );
  }
  if (!loan) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Loan Application</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[loan.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {loan.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Loan Amount</p>
          <p className="font-semibold">{formatCurrency(loan.loanAmount)}</p>
        </div>
        <div>
          <p className="text-gray-500">Tenure</p>
          <p className="font-semibold">{loan.tenure} days</p>
        </div>
        <div>
          <p className="text-gray-500">Interest Rate</p>
          <p className="font-semibold">{loan.interestRate}% p.a.</p>
        </div>
        <div>
          <p className="text-gray-500">Simple Interest</p>
          <p className="font-semibold">{formatCurrency(loan.simpleInterest)}</p>
        </div>
        <div>
          <p className="text-gray-500">Total Repayment</p>
          <p className="font-bold text-brand-700">{formatCurrency(loan.totalRepayment)}</p>
        </div>
        <div>
          <p className="text-gray-500">Applied On</p>
          <p className="font-semibold">{formatDate(loan.createdAt)}</p>
        </div>
        {loan.disbursedAt && (
          <div>
            <p className="text-gray-500">Disbursed On</p>
            <p className="font-semibold">{formatDate(loan.disbursedAt)}</p>
          </div>
        )}
      </div>

      {loan.status === 'rejected' && loan.rejectionReason && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-semibold text-red-700">Rejection Reason</p>
          <p className="text-sm text-red-600 mt-1">{loan.rejectionReason}</p>
        </div>
      )}

      {(loan.status === 'disbursed' || loan.status === 'closed') && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
          <h3 className="font-semibold text-gray-700">Repayment Progress</h3>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Paid</span>
            <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Outstanding</span>
            <span className="font-medium text-orange-600">{formatCurrency(outstanding)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-brand-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalPaid / loan.totalRepayment) * 100).toFixed(1)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 text-right">
            {((totalPaid / loan.totalRepayment) * 100).toFixed(1)}% repaid
          </p>
        </div>
      )}
    </div>
  );
}
