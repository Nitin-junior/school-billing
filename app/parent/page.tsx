'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ─── types ─────────────────────────────────────────────── */
interface StudentInfo {
  _id: string; name: string; studentId: string;
  className: string; section: string; rollNumber: number;
  parentId: { name: string; phone: string; whatsappActivated: boolean } | null;
}
interface InvoiceItem { name: string; amount: number }
interface Invoice {
  _id: string; invoiceNumber: string;
  monthBS: string; monthAD: string;
  feeHeads: Record<string, number>;
  totalAmount: number; paidAmount: number;
  lateFine: number; discount: number;
  dueDate: string; dueDateBS?: string;
  status: 'pending' | 'partial' | 'overdue' | 'paid';
}
interface Payment {
  _id: string; receiptNumber: string;
  amount: number; paymentMode: string;
  paymentDateBS: string; invoiceId: { monthBS?: string; invoiceNumber?: string } | null;
}

const FEE_LABELS: Record<string, string> = {
  tuition: 'Tuition', exam: 'Exam', library: 'Library',
  sports: 'Sports', lab: 'Lab', hostel: 'Hostel',
  uniform: 'Uniform', stationery: 'Stationery',
};

const PAY_METHODS = [
  { id: 'esewa',      label: 'eSewa',      color: '#60bb47', emoji: '🟢' },
  { id: 'khalti',     label: 'Khalti',     color: '#5c2d91', emoji: '🟣' },
  { id: 'connectips', label: 'ConnectIPS', color: '#0066b2', emoji: '🔵' },
];

type TabId = 'home' | 'bills' | 'history' | 'notifications';

function BottomNav({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  const items: { id: TabId; icon: string; label: string }[] = [
    { id: 'home',          icon: '🏠', label: 'Home'          },
    { id: 'bills',         icon: '🧾', label: 'Bills'         },
    { id: 'history',       icon: '📋', label: 'History'       },
    { id: 'notifications', icon: '🔔', label: 'Notifications' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-slate-200 flex z-40">
      {items.map(({ id, icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
            tab === id ? 'text-purple-600' : 'text-slate-400'
          }`}
        >
          <span className="text-xl leading-none">{icon}</span>
          {label}
          {tab === id && <span className="w-1 h-1 rounded-full bg-purple-600 mt-0.5" />}
        </button>
      ))}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function ParentPortalPage() {
  const router = useRouter();
  const [tab,      setTab]      = useState<TabId>('home');
  const [student,  setStudent]  = useState<StudentInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  /* fetch parent session data */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch('/api/parent');
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setStudent(data.student ?? null);
      setInvoices(data.invoices ?? []);
      setPayments(data.payments ?? []);
      setLoading(false);
    })();
  }, []);

  const currentDue = invoices.find((i) => i.status !== 'paid');
  const dueAmount  = currentDue
    ? currentDue.totalAmount + currentDue.lateFine - currentDue.paidAmount
    : 0;
  const totalDue   = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((s, i) => s + i.totalAmount + i.lateFine - i.paidAmount, 0);

  /* ── header ──────────────────────────────────────────── */
  const Header = () => (
    <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 px-5 pt-10 pb-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg">🏫</div>
          <div>
            <p className="text-xs text-purple-200">
              {process.env.NEXT_PUBLIC_SCHOOL_NAME ?? 'ShulkaPro School'}
            </p>
            <p className="font-bold text-sm leading-tight">Parent Portal</p>
          </div>
        </div>
        <button
          onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); }}
          className="text-purple-200 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-5 w-40 bg-white/20 rounded" />
          <div className="h-4 w-28 bg-white/10 rounded" />
        </div>
      ) : (
        <div>
          <p className="text-purple-200 text-sm">Welcome back,</p>
          <p className="text-xl font-bold">{student?.parentId?.name ?? 'Parent'}</p>
          {student && (
            <p className="text-purple-200 text-sm mt-0.5">
              {student.name} · {student.className}-{student.section} · Roll {student.rollNumber}
            </p>
          )}
        </div>
      )}
    </div>
  );

  /* ── HOME tab ─────────────────────────────────────────── */
  const HomeTab = () => (
    <div className="p-4 space-y-4 pb-24">

      {/* Due card */}
      <div className={`rounded-2xl p-5 text-white ${
        dueAmount > 0
          ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-rose-200'
          : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200'
      }`}>
        <p className="text-sm font-medium opacity-90">
          {dueAmount > 0 ? 'Current Due Amount' : 'All Dues Cleared!'}
        </p>
        {loading ? (
          <div className="mt-1 h-10 w-36 bg-white/20 animate-pulse rounded-lg" />
        ) : (
          <p className="text-4xl font-bold mt-1">
            {dueAmount > 0 ? `₨ ${dueAmount.toLocaleString('en-IN')}` : '✅ Paid Up'}
          </p>
        )}
        {currentDue && (
          <p className="text-xs opacity-75 mt-1">
            For {currentDue.monthBS} · Due {currentDue.dueDateBS ?? currentDue.dueDate?.slice(0, 10)}
          </p>
        )}
        {dueAmount > 0 && (
          <button
            onClick={() => setTab('bills')}
            className="mt-4 bg-white text-rose-600 font-bold text-sm px-5 py-2 rounded-xl active:scale-95 transition-transform"
          >
            Pay Now →
          </button>
        )}
      </div>

      {/* Fee breakdown for current invoice */}
      {currentDue && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Fee Breakdown · {currentDue.monthBS}
          </p>
          <div className="space-y-2">
            {Object.entries(currentDue.feeHeads ?? {}).map(([k, v]) =>
              v > 0 ? (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-500">{FEE_LABELS[k] ?? k}</span>
                  <span className="font-medium text-slate-800">₨ {v.toLocaleString('en-IN')}</span>
                </div>
              ) : null
            )}
            {currentDue.lateFine > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Late Fine</span>
                <span>₨ {currentDue.lateFine.toLocaleString('en-IN')}</span>
              </div>
            )}
            {currentDue.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>− ₨ {currentDue.discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-2 flex justify-between font-bold">
              <span className="text-slate-800">Net Payable</span>
              <span className="text-red-600">₨ {dueAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Online payment methods */}
      {dueAmount > 0 && currentDue && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pay Online</p>
          <div className="grid grid-cols-3 gap-2">
            {PAY_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setPayingId(m.id)}
                style={{ borderColor: payingId === m.id ? m.color : undefined }}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition-all active:scale-95
                  ${payingId === m.id ? 'bg-opacity-10' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span style={{ color: m.color }}>{m.label}</span>
              </button>
            ))}
          </div>
          {payingId && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <p className="font-semibold">Redirecting to {PAY_METHODS.find((m) => m.id === payingId)?.label}…</p>
              <p className="mt-0.5 text-amber-600">Online payment integration coming soon. Please pay at school.</p>
            </div>
          )}
        </div>
      )}

      {/* Recent payments */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent Payments</p>
          <button onClick={() => setTab('history')} className="text-xs text-purple-600 font-semibold">View all →</button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />)}
          </div>
        ) : payments.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-4">No payments yet</p>
        ) : (
          <div className="space-y-2">
            {payments.slice(0, 3).map((p) => (
              <div key={p._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800">₨ {p.amount.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-400">{p.paymentDateBS} · {p.paymentMode}</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                  #{p.receiptNumber.slice(-5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp setup nudge */}
      {student?.parentId && !student.parentId.whatsappActivated && (
        <Link
          href="/parent/whatsapp-setup"
          className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4 hover:bg-green-100 transition-colors"
        >
          <span className="text-2xl">💬</span>
          <div>
            <p className="text-sm font-bold text-green-800">Activate WhatsApp Notifications</p>
            <p className="text-xs text-green-600 mt-0.5">Get fee reminders & receipts on WhatsApp</p>
          </div>
          <span className="ml-auto text-green-600">→</span>
        </Link>
      )}
    </div>
  );

  /* ── BILLS tab ────────────────────────────────────────── */
  const BillsTab = () => (
    <div className="p-4 space-y-3 pb-24">
      <h2 className="text-base font-bold text-slate-800">All Invoices</h2>
      {loading ? (
        [1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />)
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-2">🧾</div>
          <p>No invoices found</p>
        </div>
      ) : (
        invoices.map((inv) => {
          const due = inv.totalAmount + inv.lateFine - inv.paidAmount;
          const statusColors: Record<string, string> = {
            pending: 'bg-amber-100 text-amber-700',
            partial: 'bg-blue-100 text-blue-700',
            overdue: 'bg-red-100 text-red-700',
            paid:    'bg-emerald-100 text-emerald-700',
          };
          return (
            <div
              key={inv._id}
              className={`bg-white rounded-2xl border p-4 shadow-sm ${
                inv.status === 'overdue' ? 'border-red-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-800">{inv.monthBS}</p>
                  <p className="text-xs text-slate-400 font-mono">{inv.invoiceNumber}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusColors[inv.status]}`}>
                  {inv.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Total',   val: inv.totalAmount,  color: 'text-slate-800' },
                  { label: 'Paid',    val: inv.paidAmount,   color: 'text-emerald-600' },
                  { label: 'Balance', val: Math.max(0, due), color: due > 0 ? 'text-red-600' : 'text-emerald-600' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-slate-50 rounded-xl py-2">
                    <p className={`text-sm font-bold ${color}`}>₨{val.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {inv.lateFine > 0 && (
                <p className="mt-2 text-xs text-red-500 text-center">+ ₨{inv.lateFine.toLocaleString('en-IN')} late fine</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  /* ── HISTORY tab ──────────────────────────────────────── */
  const HistoryTab = () => (
    <div className="p-4 space-y-3 pb-24">
      <h2 className="text-base font-bold text-slate-800">Payment History</h2>
      {loading ? (
        [1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-2xl" />)
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-2">📋</div>
          <p>No payments yet</p>
        </div>
      ) : (
        payments.map((p) => (
          <div key={p._id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg shrink-0">
              💳
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">₨ {p.amount.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-400">
                {p.paymentDateBS} · {p.paymentMode.toUpperCase()}
                {p.invoiceId?.monthBS ? ` · ${p.invoiceId.monthBS}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-600 font-mono">#{p.receiptNumber}</p>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Paid</span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  /* ── NOTIFICATIONS tab ────────────────────────────────── */
  const NotificationsTab = () => (
    <div className="p-4 space-y-4 pb-24">
      <h2 className="text-base font-bold text-slate-800">Notifications</h2>
      <div className="text-center py-12 text-slate-400">
        <div className="text-4xl mb-2">🔔</div>
        <p className="text-sm">Notifications will appear here</p>
        {student?.parentId && !student.parentId.whatsappActivated && (
          <Link
            href="/parent/whatsapp-setup"
            className="mt-4 inline-block text-sm text-purple-600 font-semibold underline"
          >
            Activate WhatsApp to receive alerts
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 max-w-[430px] mx-auto">
      <Header />

      {/* Tab content */}
      {tab === 'home'          && <HomeTab />}
      {tab === 'bills'         && <BillsTab />}
      {tab === 'history'       && <HistoryTab />}
      {tab === 'notifications' && <NotificationsTab />}

      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
