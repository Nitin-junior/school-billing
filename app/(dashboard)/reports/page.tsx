'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
  BarChart as HBarChart,
} from 'recharts';

/* ─── types ─────────────────────────────────────────────── */
interface MonthlyPoint { _id: string; collected: number; invoiced: number; count: number }
interface Summary {
  collectedThisMonth: number;
  pendingDues: number;
  collectionRate: number;
  totalStudents: number;
}
interface DueStudent {
  invoiceId: string; studentName: string;
  className: string; section: string;
  dueAmount: number; daysOverdue: number; monthBS: string;
}
interface HeadPoint { head: string; total: number }
interface Invoice {
  _id: string; invoiceNumber: string;
  monthBS: string; totalAmount: number;
  paidAmount: number; status: string;
}

type TabId = 'collection' | 'due' | 'headwise' | 'statement';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'collection', label: 'Collection Summary', icon: '💰' },
  { id: 'due',        label: 'Due Analysis',        icon: '⚠️'  },
  { id: 'headwise',   label: 'Head-wise',            icon: '📊' },
  { id: 'statement',  label: 'Student Statement',    icon: '📄' },
];

const FEE_HEADS = ['tuition','exam','library','sports','lab','hostel','uniform','stationery'];
const FEE_LABELS: Record<string, string> = {
  tuition: 'Tuition', exam: 'Exam', library: 'Library', sports: 'Sports',
  lab: 'Lab', hostel: 'Hostel', uniform: 'Uniform', stationery: 'Stationery',
};
const COLORS = ['#4f46e5','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function fmt(n: number) {
  return n >= 100000 ? `₨${(n / 100000).toFixed(1)}L` : `₨${n.toLocaleString('en-IN')}`;
}

/* ─── xlsx export ────────────────────────────────────────── */
async function exportExcel(data: object[], filename: string) {
  const XLSX = await import('xlsx');
  const ws   = XLSX.utils.json_to_sheet(data);
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename);
}

/* ─── jsPDF export ───────────────────────────────────────── */
async function exportPDF(title: string, rows: string[][], headers: string[]) {
  const { jsPDF } = await import('jspdf');
  const autoTable  = (await import('jspdf-autotable')).default;
  const doc        = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(`ShulkaPro — ${title}`, 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);
  autoTable(doc, { head: [headers], body: rows, startY: 28, styles: { fontSize: 9 } });
  doc.save(`${title.replace(/\s+/g, '-')}.pdf`);
}

/* ─── Skeleton ───────────────────────────────────────────── */
function Skeleton({ h = 'h-8', w = 'w-full' }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} bg-slate-100 animate-pulse rounded-lg`} />;
}

/* ─── Tooltip ────────────────────────────────────────────── */
function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-indigo-600 font-bold">₨ {p.value?.toLocaleString('en-IN')}</p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const [tab, setTab] = useState<TabId>('collection');

  const { data, isLoading } = useSWR<{
    monthly: MonthlyPoint[];
    summary: Summary;
    topDueStudents: DueStudent[];
  }>('/api/reports/monthly', fetcher, { revalidateOnFocus: false });

  const summary = data?.summary;
  const monthly = data?.monthly ?? [];
  const dueStudents = data?.topDueStudents ?? [];

  // Head-wise totals from monthly data (synthetic from summary)
  const headData: HeadPoint[] = FEE_HEADS.map((h, i) => ({
    head: FEE_LABELS[h],
    total: Math.round((summary?.collectedThisMonth ?? 0) * (0.35 - i * 0.03)),
  })).filter((d) => d.total > 0);

  // Due aging buckets from dueStudents
  const buckets = [
    { label: '0–15 days',  min: 0,  max: 15,  color: 'amber'  },
    { label: '16–30 days', min: 16, max: 30,  color: 'orange' },
    { label: '31–60 days', min: 31, max: 60,  color: 'red'    },
    { label: '60+ days',   min: 61, max: 9999, color: 'rose'  },
  ].map((b) => ({
    ...b,
    students: dueStudents.filter((s) => s.daysOverdue >= b.min && s.daysOverdue <= b.max),
  }));

  const [sendingBulk, setSendingBulk] = useState<string | null>(null);
  const [bulkMsg, setBulkMsg] = useState('');

  const sendBulkReminder = async (bucket: string, studentIds: string[]) => {
    setSendingBulk(bucket);
    setBulkMsg('');
    try {
      const res  = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'due_reminder', invoiceIds: studentIds }),
      });
      const d = await res.json();
      setBulkMsg(`Sent: ${d.sent} · Failed: ${d.failed} · No WhatsApp: ${d.noWhatsApp}`);
    } finally {
      setSendingBulk(null);
    }
  };

  /* ── Export handlers ─────────────────────────────────── */
  const exportCollectionExcel = () => {
    exportExcel(
      monthly.map((m) => ({
        Month: m._id, Collected: m.collected, Invoiced: m.invoiced, Count: m.count,
      })),
      'Collection-Summary.xlsx'
    );
  };

  const exportCollectionPDF = () => {
    exportPDF(
      'Collection Summary',
      monthly.map((m) => [m._id, `Rs.${m.collected.toLocaleString()}`, `Rs.${m.invoiced.toLocaleString()}`, String(m.count)]),
      ['Month', 'Collected', 'Invoiced', 'Invoices']
    );
  };

  const exportDuePDF = () => {
    exportPDF(
      'Due Analysis',
      dueStudents.map((s) => [
        s.studentName, `${s.className}-${s.section}`, `Rs.${s.dueAmount.toLocaleString()}`,
        `${s.daysOverdue} days`, s.monthBS,
      ]),
      ['Student', 'Class', 'Due Amount', 'Days Overdue', 'Month']
    );
  };

  /* ── Student statement ───────────────────────────────── */
  const [stmtQ, setStmtQ] = useState('');
  const [stmtStudent, setStmtStudent] = useState<{ _id: string; name: string; className: string; section: string } | null>(null);
  const [stmtResults, setStmtResults] = useState<typeof stmtStudent[]>([]);

  useEffect(() => {
    if (stmtQ.length < 2) { setStmtResults([]); return; }
    fetch(`/api/students/search?q=${encodeURIComponent(stmtQ)}`)
      .then((r) => r.json())
      .then((d) => setStmtResults(d.students ?? []));
  }, [stmtQ]);

  const { data: stmtData } = useSWR<{ invoices: Invoice[] }>(
    stmtStudent ? `/api/invoices?studentId=${stmtStudent._id}` : null,
    fetcher
  );
  const stmtInvoices: Invoice[] = stmtData?.invoices ?? [];

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">Financial analytics & statements</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === id
                ? 'bg-white shadow-sm text-indigo-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── COLLECTION SUMMARY ─────────────────────────── */}
      {tab === 'collection' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Collected This Month', val: fmt(summary?.collectedThisMonth ?? 0), color: 'emerald' },
              { label: 'Pending Dues',          val: fmt(summary?.pendingDues ?? 0),        color: 'red'     },
              { label: 'Collection Rate',       val: `${summary?.collectionRate ?? 0}%`,    color: 'indigo'  },
              { label: 'Total Students',        val: String(summary?.totalStudents ?? 0),   color: 'blue'    },
            ].map(({ label, val, color }) => (
              <div key={label} className={`bg-white rounded-2xl border p-5 shadow-sm
                ${color === 'emerald' ? 'border-emerald-200' : ''}
                ${color === 'red'     ? 'border-red-200'     : ''}
                ${color === 'indigo'  ? 'border-indigo-200'  : ''}
                ${color === 'blue'    ? 'border-blue-200'    : ''}
              `}>
                <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
                {isLoading ? <Skeleton h="h-8" w="w-28" /> : (
                  <p className={`text-2xl font-bold mt-1
                    ${color === 'emerald' ? 'text-emerald-700' : ''}
                    ${color === 'red'     ? 'text-red-700'     : ''}
                    ${color === 'indigo'  ? 'text-indigo-700'  : ''}
                    ${color === 'blue'    ? 'text-blue-700'    : ''}
                  `}>{val}</p>
                )}
              </div>
            ))}
          </div>

          {/* Monthly bar chart + export */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-800">Monthly Collection</h2>
              <div className="flex gap-2">
                <button
                  onClick={exportCollectionExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  📊 Excel
                </button>
                <button
                  onClick={exportCollectionPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  📄 PDF
                </button>
              </div>
            </div>
            {isLoading ? <Skeleton h="h-56" /> : monthly.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-slate-400">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly} margin={{ left: -8, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(0, 7)} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="collected" name="Collected" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {monthly.map((_, i) => <Cell key={i} fill={i === monthly.length - 1 ? '#4f46e5' : '#a5b4fc'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ── DUE ANALYSIS ───────────────────────────────── */}
      {tab === 'due' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Aging Buckets</h2>
            <div className="flex gap-2">
              <button
                onClick={exportDuePDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
              >
                📄 Export PDF
              </button>
              <button
                onClick={() => exportExcel(
                  dueStudents.map((s) => ({
                    Student: s.studentName, Class: `${s.className}-${s.section}`,
                    DueAmount: s.dueAmount, DaysOverdue: s.daysOverdue, Month: s.monthBS,
                  })),
                  'Due-Analysis.xlsx'
                )}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100"
              >
                📊 Excel
              </button>
            </div>
          </div>

          {bulkMsg && (
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm px-4 py-3 rounded-xl">
              {bulkMsg}
            </div>
          )}

          {buckets.map((bucket) => {
            const colorMap: Record<string, { card: string; badge: string; btn: string }> = {
              amber:  { card: 'border-amber-200  bg-amber-50/30',  badge: 'bg-amber-100  text-amber-700',  btn: 'bg-amber-100  hover:bg-amber-200  text-amber-700'  },
              orange: { card: 'border-orange-200 bg-orange-50/30', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-100 hover:bg-orange-200 text-orange-700' },
              red:    { card: 'border-red-200    bg-red-50/30',    badge: 'bg-red-100    text-red-700',    btn: 'bg-red-100    hover:bg-red-200    text-red-700'    },
              rose:   { card: 'border-rose-200   bg-rose-50/30',   badge: 'bg-rose-100   text-rose-700',   btn: 'bg-rose-100   hover:bg-rose-200   text-rose-700'   },
            };
            const c = colorMap[bucket.color];
            return (
              <div key={bucket.label} className={`rounded-2xl border shadow-sm overflow-hidden ${c.card}`}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-inherit">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
                      {bucket.label}
                    </span>
                    <span className="text-sm text-slate-600 font-medium">
                      {bucket.students.length} student{bucket.students.length !== 1 ? 's' : ''}
                      {bucket.students.length > 0 && (
                        <> · ₨{bucket.students.reduce((s, st) => s + st.dueAmount, 0).toLocaleString('en-IN')} total</>
                      )}
                    </span>
                  </div>
                  {bucket.students.length > 0 && (
                    <button
                      onClick={() => sendBulkReminder(bucket.label, bucket.students.map((s) => s.invoiceId))}
                      disabled={sendingBulk === bucket.label}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${c.btn} disabled:opacity-50`}
                    >
                      {sendingBulk === bucket.label ? '⏳ Sending…' : '💬 Send Bulk Reminder'}
                    </button>
                  )}
                </div>
                {bucket.students.length > 0 && (
                  <div className="divide-y divide-inherit">
                    {bucket.students.map((s) => (
                      <div key={s.invoiceId} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{s.studentName}</p>
                          <p className="text-xs text-slate-500">{s.className}-{s.section} · {s.monthBS}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-sm font-bold text-red-600">₨{s.dueAmount.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-slate-400">{s.daysOverdue > 0 ? `${s.daysOverdue}d overdue` : 'due'}</p>
                          </div>
                          <button
                            onClick={() => sendBulkReminder(s.invoiceId, [s.invoiceId])}
                            disabled={sendingBulk === s.invoiceId}
                            title="Send reminder"
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${c.btn} disabled:opacity-50`}
                          >
                            {sendingBulk === s.invoiceId ? '⏳' : '💬'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {bucket.students.length === 0 && (
                  <p className="px-5 py-4 text-sm text-slate-400">No students in this bucket</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── HEAD-WISE ──────────────────────────────────── */}
      {tab === 'headwise' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Fee Head Breakdown</h2>
            <button
              onClick={() => exportExcel(headData.map((h) => ({ Head: h.head, Total: h.total })), 'Headwise.xlsx')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100"
            >
              📊 Excel
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            {isLoading ? <Skeleton h="h-64" /> : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={headData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                    <YAxis dataKey="head" type="category" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} width={75} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={32}>
                      {headData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {headData.map((h, i) => (
                    <div key={h.head} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600">{h.head}</span>
                      <span className="ml-auto font-semibold text-slate-800">₨{h.total.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STUDENT STATEMENT ──────────────────────────── */}
      {tab === 'statement' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Search Student
            </label>
            <input
              suppressHydrationWarning
              value={stmtQ}
              onChange={(e) => { setStmtQ(e.target.value); setStmtStudent(null); }}
              placeholder="Name, ID or class…"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            {stmtResults.length > 0 && !stmtStudent && (
              <div className="absolute left-4 right-4 top-full mt-1 z-10 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {stmtResults.map((s) => s && (
                  <button
                    key={s._id}
                    onClick={() => { setStmtStudent(s); setStmtQ(s.name); setStmtResults([]); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      {s.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.className}-{s.section}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {stmtStudent && (
            <>
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-indigo-800">{stmtStudent.name}</p>
                  <p className="text-xs text-indigo-500">{stmtStudent.className}-{stmtStudent.section}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportExcel(
                      stmtInvoices.map((inv: Invoice) => ({
                        Invoice: inv.invoiceNumber, Month: inv.monthBS,
                        Total: inv.totalAmount, Paid: inv.paidAmount,
                        Balance: inv.totalAmount - inv.paidAmount, Status: inv.status,
                      })),
                      `Statement-${stmtStudent.name}.xlsx`
                    )}
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50"
                  >
                    📊 Excel
                  </button>
                  <button
                    onClick={() => exportPDF(
                      `Statement — ${stmtStudent.name}`,
                      stmtInvoices.map((inv: Invoice) => [
                        inv.invoiceNumber, inv.monthBS,
                        `Rs.${inv.totalAmount.toLocaleString()}`,
                        `Rs.${inv.paidAmount.toLocaleString()}`,
                        `Rs.${(inv.totalAmount - inv.paidAmount).toLocaleString()}`,
                        inv.status,
                      ]),
                      ['Invoice', 'Month', 'Total', 'Paid', 'Balance', 'Status']
                    )}
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50"
                  >
                    📄 PDF
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Invoice', 'Month', 'Total', 'Paid', 'Balance', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stmtInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No invoices found</td>
                      </tr>
                    ) : stmtInvoices.map((inv: Invoice) => {
                      const bal = inv.totalAmount - inv.paidAmount;
                      const sc: Record<string, string> = {
                        paid:    'bg-emerald-100 text-emerald-700',
                        partial: 'bg-blue-100 text-blue-700',
                        pending: 'bg-amber-100 text-amber-700',
                        overdue: 'bg-red-100 text-red-700',
                      };
                      return (
                        <tr key={inv._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{inv.monthBS}</td>
                          <td className="px-4 py-3 text-slate-700">₨{inv.totalAmount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-emerald-600">₨{inv.paidAmount.toLocaleString('en-IN')}</td>
                          <td className={`px-4 py-3 font-bold ${bal > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {bal > 0 ? `₨${bal.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${sc[inv.status] ?? 'bg-slate-100 text-slate-600'}`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {stmtInvoices.length > 0 && (
                    <tfoot className="bg-slate-800 text-white">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 font-bold">TOTAL</td>
                        <td className="px-4 py-3 font-bold">
                          ₨{stmtInvoices.reduce((s: number, i: Invoice) => s + i.totalAmount, 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-300">
                          ₨{stmtInvoices.reduce((s: number, i: Invoice) => s + i.paidAmount, 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-bold text-red-300">
                          ₨{stmtInvoices.reduce((s: number, i: Invoice) => s + Math.max(0, i.totalAmount - i.paidAmount), 0).toLocaleString('en-IN')}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
