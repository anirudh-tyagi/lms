'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { User } from '@/types';
import { formatDate } from '@/lib/utils';

export default function SalesPage() {
  const [leads, setLeads] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/operations/sales/leads')
      .then((res) => setLeads(res.data.leads))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Sales — Leads</h1>
      <p className="text-sm text-gray-500 mb-6">
        Borrowers who have registered but not yet submitted a loan application.
      </p>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : leads.length === 0 ? (
        <p className="text-gray-400">No leads at this time.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead, i) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 text-gray-900 font-medium">{lead.email}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {(lead as unknown as { createdAt?: string }).createdAt
                      ? formatDate((lead as unknown as { createdAt: string }).createdAt)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-5 py-2 border-t border-gray-100">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} total
          </p>
        </div>
      )}
    </div>
  );
}
