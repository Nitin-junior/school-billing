'use client';

import useSWR from 'swr';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useState } from 'react';

/* ─── fetcher ─────────────────────────────────────────── */
const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* ─── types ────────────────────────────────────────────── */
interface DueSt {
  invoiceId: string;
  studentDbId: string;
  studentName: string;
  className: string;
  section: string;
  dueAmount: number;
  daysOverdue: number;
  monthBS: string;
}
interface MonthlyPoint { _id: string; collected: number; count: number; invoiced: number }
interface Summary {
  collectedThisMonth: number;
  pendingDues: number;
  overdueCount: number;
  totalStudents: number;
  collectionRate: number;
}

/* ─── helpers ──────────────────────────────────────────── */
const fmt = (n: number) =>
  n >= 100000
    ? `₨ ${(n / 100000).toFixed(1)}L`
    : `₨ ${n.toLocaleString('en-IN')}`;

function StatCard({
  label, value, sub, color, icon, loading,
}: {
  label: string; value: string; sub?: string;
  color: 'green' | 'red' | 'blue' | 'indigo';
  icon: string; loading: boolean;
}) {
  const palette = {
    green:  { card: 'bg-emerald-900/20 border-emerald-700/40', val: 'text-emerald-400', icon: 'bg-emerald-900/50 text-emerald-400' },
    red:    { card: 'bg-red-900/20     border-red-700/40',     val: 'text-red-400',     icon: 'bg-red-900/50    text-red-400'     },
    blue:   { card: 'bg-blue-900/20    border-blue-700/40',    val: 'text-blue-400',    icon: 'bg-blue-900/50   text-blue-400'    },
    indigo: { card: 'bg-indigo-900/20  border-indigo-700/40',  val: 'text-indigo-400',  icon: 'bg-indigo-900/50 text-indigo-400' },
  }[color];

  return (
    <div className={`rounded-2xl border p-5 flex items-start gap-4 ${palette.card}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${palette.icon}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide truncate">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-7 w-28 bg-slate-700 animate-pulse rounded-lg" />
        ) : (
          <p className={`text-2xl font-bold mt-0.5 ${palette.val}`}>{value}</p>
        )}
        {sub && !loading && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── custom tooltip ───────────────────────────────────── */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-emerald-600 font-bold">₨ {payload[0].value.toLocaleString('en-IN')}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { data, isLoading } = useSWR<{
    monthly: MonthlyPoint[];
    summary: Summary;
    topDueStudents: DueSt[];
  }>('/api/reports/monthly', fetcher, { refreshInterval: 60_000 });

  const [sendingId, setSendingId] = useState<string | null>(null);

  const summary   = data?.summary;
  const monthly   = data?.monthly ?? [];
  const topDue    = data?.topDueStudents ?? [];

  const sendReminder = async (studentDbId: string) => {
    setSendingId(studentDbId);
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payment-reminder', studentIds: [studentDbId] }),
    });
    setSendingId(null);
  };

  /* skeleton rows */
  const skeletonRows = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">Overview of school billing & collections</p>
      </div>

      {/* ── Stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Collected This Month"
          value={fmt(summary?.collectedThisMonth ?? 0)}
          sub="↑ via cash & digital"
          color="green"
          icon="💰"
          loading={isLoading}
        />
        <StatCard
          label="Pending Dues"
          value={fmt(summary?.pendingDues ?? 0)}
          sub={`${summary?.overdueCount ?? 0} students overdue`}
          color="red"
          icon="⚠️"
          loading={isLoading}
        />
        <StatCard
          label="Total Students"
          value={String(summary?.totalStudents ?? 0)}
          sub="Active enrolments"
          color="blue"
          icon="👨‍🎓"
          loading={isLoading}
        />
        <div className="rounded-2xl border p-5 bg-indigo-900/20 border-indigo-700/40">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-900/50 text-indigo-400 flex items-center justify-center text-xl shrink-0">
              📊
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Collection Rate</p>
              {isLoading ? (
                <div className="mt-1.5 h-7 w-16 bg-slate-700 animate-pulse rounded-lg" />
              ) : (
                <p className="text-2xl font-bold text-indigo-400 mt-0.5">
                  {summary?.collectionRate ?? 0}%
                </p>
              )}
              <div className="mt-2 h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                  style={{ width: `${summary?.collectionRate ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts row ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Bar chart — 3 cols */}
        <div className="xl:col-span-3 bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Monthly Collection</h2>
              <p className="text-xs text-slate-400 mt-0.5">BS month-wise breakdown</p>
            </div>
            <span className="text-xs bg-emerald-900/40 text-emerald-400 font-semibold px-2.5 py-1 rounded-full">
              This Year
            </span>
          </div>

          {isLoading ? (
            <div className="h-56 bg-slate-700/30 animate-pulse rounded-xl" />
          ) : monthly.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-500 gap-2">
              <span className="text-4xl">📭</span>
              <p className="text-sm">No collection data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="_id"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => v.slice(0, 7)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="collected" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {monthly.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === monthly.length - 1 ? '#4f46e5' : '#6ee7b7'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 5 due table — 2 cols */}
        <div className="xl:col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Top Due Students</h2>
              <p className="text-xs text-slate-400 mt-0.5">Highest outstanding amounts</p>
            </div>
            <a
              href="/due-fees"
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              View all →
            </a>
          </div>

          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="space-y-3">
                {skeletonRows.map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-4 bg-slate-700 rounded flex-1" />
                    <div className="h-4 bg-slate-700 rounded w-20" />
                  </div>
                ))}
              </div>
            ) : topDue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 py-8">
                <span className="text-4xl">✅</span>
                <p className="text-sm font-medium">No pending dues!</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left pb-2 text-xs font-semibold text-slate-400 uppercase">Student</th>
                    <th className="text-right pb-2 text-xs font-semibold text-slate-400 uppercase">Due</th>
                    <th className="text-right pb-2 text-xs font-semibold text-slate-400 uppercase">Days</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {topDue.map((s) => (
                    <tr key={s.invoiceId} className="border-b border-slate-700/50 last:border-0">
                      <td className="py-2.5 pr-2">
                        <p className="font-medium text-slate-100 text-xs leading-tight truncate max-w-[100px]">
                          {s.studentName}
                        </p>
                        <p className="text-slate-400 text-xs">{s.className}-{s.section}</p>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="font-bold text-red-400 text-xs">
                          ₨{s.dueAmount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-2.5 px-1 text-right">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                          s.daysOverdue > 30
                            ? 'bg-red-900/40 text-red-400'
                            : s.daysOverdue > 0
                            ? 'bg-amber-900/40 text-amber-400'
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {s.daysOverdue > 0 ? `${s.daysOverdue}d` : 'Due'}
                        </span>
                      </td>
                      <td className="py-2.5 pl-1">
                        <button
                          onClick={() => sendReminder(s.studentDbId)}
                          disabled={sendingId === s.studentDbId}
                          title="Send WhatsApp reminder"
                          className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors disabled:opacity-40 text-base"
                        >
                          {sendingId === s.studentDbId ? (
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : '💬'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Generate Bills',   href: '/generate-bills',  emoji: '🧾', color: 'indigo' },
          { label: 'Collect Payment',  href: '/collect-payment', emoji: '💳', color: 'emerald' },
          { label: 'Send Reminders',   href: '/notifications',   emoji: '🔔', color: 'amber'  },
          { label: 'View Reports',     href: '/reports',         emoji: '📈', color: 'blue'   },
        ].map(({ label, href, emoji, color }) => (
          <a
            key={href}
            href={href}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center
              transition-all hover:scale-[1.02] active:scale-95 font-medium text-sm
              ${color === 'indigo'  ? 'bg-indigo-50  border-indigo-200  text-indigo-700  hover:bg-indigo-100'  : ''}
              ${color === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : ''}
              ${color === 'amber'   ? 'bg-amber-50   border-amber-200   text-amber-700   hover:bg-amber-100'   : ''}
              ${color === 'blue'    ? 'bg-blue-50    border-blue-200    text-blue-700    hover:bg-blue-100'    : ''}
            `}
          >
            <span className="text-2xl">{emoji}</span>
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
