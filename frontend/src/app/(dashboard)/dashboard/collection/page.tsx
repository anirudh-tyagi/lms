'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { LoanApplication, Applicant, Payment } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface LoanWithPayments extends LoanApplication {
  totalPaid: number;
  outstanding: number;
}

function getApplicant(loan: LoanApplication): Applicant | null {
  if (typeof loan.applicantId === 'object' && loan.applicantId !== null) {
    return loan.applicantId as Applicant;
  }
  return null;
}

const STATUS_COLORS: Record<string, string> = {
  disbursed: 'bg-purple-100 text-purple-800',
  closed: 'bg-green-100 text-green-800',
};

export default function CollectionPage() {
  const [loans, setLoans] = useState<LoanWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<LoanWithPayments | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ utrNumber: '', amount: '', paymentDate: '' });
  const [paymentError, setPaymentError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');

  function fetchLoans() {
    setLoading(true);
    api.get('/operations/collection/loans')
      .then((res) => setLoans(res.data.loans))
      .catch(() => setError('Failed to load loans'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchLoans(); }, []);

  async function openLoan(loan: LoanWithPayments) {
    setSelectedLoan(loan);
    setShowPaymentForm(false);
    setPaymentForm({ utrNumber: '', amount: '', paymentDate: '' });
    setPaymentError('');
    setPaymentsLoading(true);
    try {
      const res = await api.get(`/operations/collection/loans/${loan._id}/payments`);
      setPayments(res.data.payments);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function recordPayment() {
    if (!selectedLoan) return;
    setPaymentError('');
    setPaymentLoading(true);
    try {
      await api.post(`/operations/collection/loans/${selectedLoan._id}/payments`, {
        utrNumber: paymentForm.utrNumber,
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
      });
      // Refresh
      fetchLoans();
      const res = await api.get(`/operations/collection/loans/${selectedLoan._id}/payments`);
      setPayments(res.data.payments);
      const refreshed = res.data;
      setSelectedLoan((prev) => prev ? {
        ...prev,
        totalPaid: refreshed.totalPaid,
        outstanding: refreshed.outstanding,
        status: refreshed.outstanding <= 0 ? 'closed' : prev.status,
      } : prev);
      setPaymentForm({ utrNumber: '', amount: '', paymentDate: '' });
      setShowPaymentForm(false);
    } catch (err: unknown) {
      setPaymentError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to record payment'
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <div className="flex gap-6">
      {/* Left: Loan list */}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Collection</h1>
        <p className="text-sm text-gray-500 mb-6">Record repayments for disbursed loans.</p>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : loans.length === 0 ? (
          <p className="text-gray-400">No active loans.</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Borrower</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Loan</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Paid / Total</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loans.map((loan) => {
                  const applicant = getApplicant(loan);
                  const pct = Math.min(100, (loan.totalPaid / loan.totalRepayment) * 100);
                  return (
                    <tr key={loan._id} className={`hover:bg-gray-50 ${selectedLoan?._id === loan._id ? 'bg-brand-50' : ''}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{applicant?.fullName ?? '—'}</p>
                        <p className="text-xs text-gray-400">{applicant?.pan}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{formatCurrency(loan.loanAmount)}</td>
                      <td className="px-5 py-3">
                        <p className="text-xs text-gray-500">{formatCurrency(loan.totalPaid)} / {formatCurrency(loan.totalRepayment)}</p>
                        <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[loan.status] ?? ''}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => openLoan(loan)}
                          className="px-3 py-1 border border-brand-500 text-brand-600 rounded-lg text-xs font-medium hover:bg-brand-50"
                        >
                          {selectedLoan?._id === loan._id ? 'Viewing' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right: Payment panel */}
      {selectedLoan && (
        <div className="w-96 flex-shrink-0 bg-white rounded-xl shadow-sm p-5 h-fit sticky top-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Payment History</h3>
            <button onClick={() => setSelectedLoan(null)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
          </div>

          <div className="text-sm text-gray-600 mb-3 space-y-1">
            <div className="flex justify-between">
              <span>Total Repayment</span>
              <span className="font-semibold">{formatCurrency(selectedLoan.totalRepayment)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Paid</span>
              <span className="font-semibold text-green-600">{formatCurrency(selectedLoan.totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Outstanding</span>
              <span className="font-semibold text-orange-600">{formatCurrency(selectedLoan.outstanding)}</span>
            </div>
          </div>

          {selectedLoan.status === 'disbursed' && !showPaymentForm && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 mb-4"
            >
              + Record Payment
            </button>
          )}

          {showPaymentForm && (
            <div className="mb-4 border border-gray-200 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">New Payment</h4>

              <div>
                <label className="text-xs font-medium text-gray-600">UTR Number</label>
                <input
                  type="text"
                  value={paymentForm.utrNumber}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, utrNumber: e.target.value.toUpperCase() }))}
                  className="mt-0.5 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. UTR12345678"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Amount (₹)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                  min={1}
                  max={selectedLoan.outstanding}
                  className="mt-0.5 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={`Max: ${selectedLoan.outstanding.toFixed(2)}`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
                  className="mt-0.5 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {paymentError && <p className="text-xs text-red-600">{paymentError}</p>}

              <div className="flex gap-2">
                <button
                  onClick={recordPayment}
                  disabled={paymentLoading || !paymentForm.utrNumber || !paymentForm.amount || !paymentForm.paymentDate}
                  className="flex-1 bg-brand-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {paymentLoading ? 'Saving…' : 'Save Payment'}
                </button>
                <button
                  onClick={() => { setShowPaymentForm(false); setPaymentError(''); }}
                  className="flex-1 border border-gray-300 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {paymentsLoading ? (
              <p className="text-xs text-gray-400">Loading payments…</p>
            ) : payments.length === 0 ? (
              <p className="text-xs text-gray-400">No payments recorded yet.</p>
            ) : (
              payments.map((p) => (
                <div key={p._id} className="border border-gray-100 rounded-lg px-3 py-2 text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span className="font-mono text-gray-500">{p.utrNumber}</span>
                    <span className="font-semibold text-green-700">{formatCurrency(p.amount)}</span>
                  </div>
                  <p className="text-gray-400">{formatDate(p.paymentDate)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
