'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { User } from '@/types';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Users, Mail, Clock, Search, Filter } from 'lucide-react';

export default function SalesPage() {
  const [leads, setLeads] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/operations/sales/leads')
      .then((res) => setLeads(res.data.leads))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            Sales — Leads
          </h1>
          <p className="text-sm text-slate-500">
            Borrowers who have registered but not yet submitted a loan application.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm w-full sm:w-64"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 glass rounded-3xl">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-slate-500 font-medium">Loading leads data...</p>
        </div>
      ) : leads.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-12 text-center border border-dashed border-slate-300"
        >
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No Leads Found</h3>
          <p className="text-slate-500 max-w-sm mx-auto">There are currently no registered users pending application submission.</p>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl overflow-hidden shadow-xl shadow-brand-900/5 border border-white/50"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Registered
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {leads.map((lead, i) => (
                  <tr key={lead.id} className="hover:bg-brand-50/50 transition-colors group">
                    <td className="px-6 py-4 text-slate-400 font-medium">{i + 1}</td>
                    <td className="px-6 py-4 text-slate-900 font-medium flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-xs">
                        {lead.email.charAt(0).toUpperCase()}
                      </div>
                      {lead.email}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {(lead as unknown as { createdAt?: string }).createdAt
                        ? formatDate((lead as unknown as { createdAt: string }).createdAt)
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-brand-600 font-medium hover:text-brand-800 opacity-0 group-hover:opacity-100 transition-opacity">
                        Send Reminder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Showing all {leads.length} leads</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
