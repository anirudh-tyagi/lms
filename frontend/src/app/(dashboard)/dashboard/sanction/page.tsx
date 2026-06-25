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

export default function SanctionPage() {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  function fetchApplications() {
    setLoading(true);
    api.get('/operations/sanction/applications')
      .then((res) => setApplications(res.data.applications))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchApplications(); }, []);

  async function approve(id: string) {
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/operations/sanction/applications/${id}/approve`);
      fetchApplications();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function submitReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/operations/sanction/applications/${rejectTarget}/reject`, { reason: rejectReason });
      setRejectTarget(null);
      setRejectReason('');
      fetchApplications();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Sanction — Review Applications</h1>
      <p className="text-sm text-gray-500 mb-6">Approve or reject pending loan applications.</p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="text-gray-400">No pending applications.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Applicant</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">PAN</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Amount</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Tenure</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Applied</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map((app) => {
                const applicant = getApplicant(app);
                return (
                  <tr key={app._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{applicant?.fullName ?? '—'}</p>
                      <p className="text-xs text-gray-400">{applicant?.employmentMode}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{applicant?.pan ?? '—'}</td>
                    <td className="px-5 py-3 font-medium">{formatCurrency(app.loanAmount)}</td>
                    <td className="px-5 py-3 text-gray-600">{app.tenure}d</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(app.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(app._id)}
                          disabled={actionLoading}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => { setRejectTarget(app._id); setRejectReason(''); }}
                          disabled={actionLoading}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Reject Application</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for rejection</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="e.g. Salary below threshold after verification"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={submitReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
