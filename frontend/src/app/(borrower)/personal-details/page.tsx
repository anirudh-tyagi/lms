'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Applicant } from '@/types';
import { motion } from 'framer-motion';
import { User, CreditCard, Calendar, Briefcase, IndianRupee, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

const EMPLOYMENT_OPTIONS = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self-employed', label: 'Self-Employed' },
  { value: 'unemployed', label: 'Unemployed' },
];

export default function PersonalDetailsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    fullName: '',
    pan: '',
    dateOfBirth: '',
    monthlySalary: '',
    employmentMode: 'salaried',
  });

  useEffect(() => {
    api.get('/borrower/personal-details')
      .then((res) => {
        const applicant: Applicant = res.data.applicant;
        setForm({
          fullName: applicant.fullName,
          pan: applicant.pan,
          dateOfBirth: applicant.dateOfBirth.slice(0, 10),
          monthlySalary: String(applicant.monthlySalary),
          employmentMode: applicant.employmentMode,
        });
        if (applicant.breStatus === 'passed') {
          setLocked(true);
        } else if (applicant.breStatus === 'failed') {
          setServerErrors(applicant.breErrors);
        }
      })
      .catch(() => {/* no existing record */})
      .finally(() => setChecking(false));
  }, []);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerErrors([]);
    setLoading(true);
    try {
      await api.post('/borrower/personal-details', {
        ...form,
        monthlySalary: Number(form.monthlySalary),
      });
      router.push('/upload');
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { errors?: string[]; message?: string } } })?.response?.data;
      if (res?.errors?.length) {
        setServerErrors(res.errors);
      } else {
        setServerErrors([res?.message ?? 'An error occurred']);
      }
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Loading your profile...</p>
      </div>
    );
  }

  if (locked) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-10 text-center max-w-lg mx-auto shadow-xl shadow-emerald-900/5"
      >
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Eligibility Approved</h2>
        <p className="text-slate-500 mb-8">Your profile has been verified successfully. Your details are now locked to prevent tampering.</p>
        <button
          onClick={() => router.push('/upload')}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          Proceed to Document Upload
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="glass rounded-3xl p-8 sm:p-10 shadow-xl shadow-brand-900/5">
      <div className="mb-8 border-b border-slate-100 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Personal Details</h2>
        <p className="text-slate-500">Provide accurate information to receive instant eligibility decisions.</p>
      </div>

      {serverErrors.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-8 p-5 bg-red-50/80 border border-red-200 rounded-2xl"
        >
          <div className="flex items-center gap-2 text-red-700 mb-3 font-semibold">
            <AlertCircle className="w-5 h-5" />
            Eligibility criteria not met:
          </div>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            {serverErrors.map((e, i) => (
              <li key={i} className="text-sm text-red-600">{e}</li>
            ))}
          </ul>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Full Name (As per PAN)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all shadow-sm"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">PAN Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={form.pan}
                onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                required
                maxLength={10}
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all shadow-sm"
                placeholder="ABCDE1234F"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Date of Birth</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-5 h-5" />
              </div>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Monthly Salary (₹)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <IndianRupee className="w-5 h-5" />
              </div>
              <input
                type="number"
                value={form.monthlySalary}
                onChange={(e) => handleChange('monthlySalary', e.target.value)}
                required
                min={0}
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all shadow-sm"
                placeholder="50000"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Employment Mode</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <select
              value={form.employmentMode}
              onChange={(e) => handleChange('employmentMode', e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all shadow-sm appearance-none"
            >
              {EMPLOYMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 bg-brand-600 text-white px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-70 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {loading ? 'Evaluating Profile...' : 'Check Eligibility & Continue'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
