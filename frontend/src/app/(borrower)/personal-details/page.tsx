'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Applicant } from '@/types';

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
    return <div className="text-center py-12 text-gray-400">Loading…</div>;
  }

  if (locked) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="text-green-600 text-4xl mb-3">✓</div>
        <h2 className="text-lg font-semibold text-gray-900">Eligibility check passed</h2>
        <p className="text-sm text-gray-500 mt-1 mb-6">Your details are locked. Proceed to upload your salary slip.</p>
        <button
          onClick={() => router.push('/upload')}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
        >
          Continue →
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Personal Details & Eligibility</h2>
      <p className="text-sm text-gray-500 mb-6">Fill in your details. We'll check your eligibility instantly.</p>

      {serverErrors.length > 0 && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-semibold text-red-700 mb-2">Eligibility check failed:</p>
          <ul className="list-disc list-inside space-y-1">
            {serverErrors.map((e, i) => (
              <li key={i} className="text-sm text-red-600">{e}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="As per PAN card"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
          <input
            type="text"
            value={form.pan}
            onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
            required
            maxLength={10}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="ABCDE1234F"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₹)</label>
          <input
            type="number"
            value={form.monthlySalary}
            onChange={(e) => handleChange('monthlySalary', e.target.value)}
            required
            min={0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. 50000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Mode</label>
          <select
            value={form.employmentMode}
            onChange={(e) => handleChange('employmentMode', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {EMPLOYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {loading ? 'Checking eligibility…' : 'Check Eligibility & Continue'}
        </button>
      </form>
    </div>
  );
}
