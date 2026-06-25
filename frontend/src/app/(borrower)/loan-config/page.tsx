'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { calculateSI, calculateTotalRepayment, formatCurrency } from '@/lib/utils';

export default function LoanConfigPage() {
  const router = useRouter();
  const [loanAmount, setLoanAmount] = useState(150000);
  const [tenure, setTenure] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [salarySlip, setSalarySlip] = useState<{ filePath: string; originalName: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('salarySlip');
    if (!stored) {
      router.replace('/upload');
      return;
    }
    setSalarySlip(JSON.parse(stored));
  }, [router]);

  const si = calculateSI(loanAmount, tenure);
  const total = calculateTotalRepayment(loanAmount, tenure);
  const dailyRate = (12 / 365 / 100) * loanAmount;

  async function handleApply() {
    if (!salarySlip) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/borrower/apply', {
        loanAmount,
        tenure,
        salarySlipPath: salarySlip.filePath,
        salarySlipOriginalName: salarySlip.originalName,
      });
      sessionStorage.removeItem('salarySlip');
      router.push('/status');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Application failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Configure Your Loan</h2>
      <p className="text-sm text-gray-500 mb-8">Adjust the sliders to choose your loan amount and repayment tenure.</p>

      {/* Loan Amount Slider */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Loan Amount</label>
          <span className="text-sm font-bold text-brand-600">{formatCurrency(loanAmount)}</span>
        </div>
        <input
          type="range"
          min={50000}
          max={500000}
          step={5000}
          value={loanAmount}
          onChange={(e) => setLoanAmount(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>₹50,000</span>
          <span>₹5,00,000</span>
        </div>
      </div>

      {/* Tenure Slider */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Tenure</label>
          <span className="text-sm font-bold text-brand-600">{tenure} days</span>
        </div>
        <input
          type="range"
          min={30}
          max={365}
          step={1}
          value={tenure}
          onChange={(e) => setTenure(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>30 days</span>
          <span>365 days</span>
        </div>
      </div>

      {/* Live Calculation Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Repayment Summary</h3>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Principal</span>
          <span className="font-medium">{formatCurrency(loanAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Interest Rate</span>
          <span className="font-medium">12% p.a. (Simple Interest)</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tenure</span>
          <span className="font-medium">{tenure} days</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Interest Amount</span>
          <span className="font-medium text-orange-600">{formatCurrency(si)}</span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
          <span className="text-gray-800">Total Repayment</span>
          <span className="text-brand-700 text-base">{formatCurrency(total)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Formula: SI = (P × R × T) / (365 × 100) = {formatCurrency(si)}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleApply}
        disabled={loading || !salarySlip}
        className="w-full bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition"
      >
        {loading ? 'Submitting application…' : 'Apply for Loan'}
      </button>
    </div>
  );
}
