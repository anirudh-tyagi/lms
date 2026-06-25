'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { LoanApplication, Applicant } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

function getApplicant(loan: LoanApplication): Applicant | null {
  if (typeof loan.applicantId === 'object' && loan.applicantId !== null) {
    return loan.applicantId as Applicant;
  }
  return null;
}

export default function DisbursementPage() {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [disbursing, setDisbursing] = useState<string | null>(null);
  const [error, setError] = useState('');

  function fetchApplications() {
    setLoading(true);
    api.get('/operations/disbursement/applications')
      .then((res) => setApplications(res.data.applications))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchApplications(); }, []);

  async function disburse(id: string) {
    setDisbursing(id);
    setError('');
    try {
      await api.patch(`/operations/disbursement/applications/${id}/disburse`);
      fetchApplications();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    } finally {
      setDisbursing(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Disbursement</h1>
      <p className="text-sm text-gray-500 mb-6">Mark sanctioned loans as disbursed (funds released).</p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="text-gray-400">No sanctioned loans pending disbursement.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Applicant</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Amount</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Total Repayment</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Tenure</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Sanctioned On</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map((app) => {
                const applicant = getApplicant(app);
                return (
                  <tr key={app._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{applicant?.fullName ?? '—'}</p>
                      <p className="text-xs text-gray-400">{applicant?.pan}</p>
                    </td>
                    <td className="px-5 py-3 font-medium">{formatCurrency(app.loanAmount)}</td>
                    <td className="px-5 py-3 text-brand-700 font-semibold">{formatCurrency(app.totalRepayment)}</td>
                    <td className="px-5 py-3 text-gray-600">{app.tenure}d</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(app.updatedAt)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => disburse(app._id)}
                        disabled={disbursing === app._id}
                        className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
                      >
                        {disbursing === app._id ? 'Disbursing…' : 'Disburse'}
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
  );
}
