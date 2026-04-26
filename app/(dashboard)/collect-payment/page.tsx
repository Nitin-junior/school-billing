'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { numberToWords } from '@/lib/pdf';
import { QRCodeSVG } from 'qrcode.react';

/* ─── types ─────────────────────────────────────────────── */
interface ParentInfo {
  name: string; phone: string;
  whatsappActivated: boolean; callmebotApiKey?: string;
}
interface StudentResult {
  _id: string;
  name: string; studentId: string;
  className: string; section: string; rollNumber: number;
  phone?: string; hostelResident: boolean;
  parentId: ParentInfo | null;
}
interface Invoice {
  _id: string; invoiceNumber: string;
  monthBS: string; monthAD: string;
  feeHeads: Record<string, number>;
  totalAmount: number; paidAmount: number;
  lateFine: number; discount: number;
  dueDate: string; dueDateBS?: string;
  status: 'pending' | 'partial' | 'overdue' | 'paid';
}
interface ReceiptData {
  invoiceId?: string;
  receiptNumber: string; invoiceNumber: string;
  paymentDate: string; paymentMode: string;
  amount: number; amountInWords: string;
  lateFine: number; monthBS: string;
  feeHeads: Record<string, number>;
  totalAmount: number; paidAmount: number; balance: number;
  status: string; whatsappSent: boolean;
  remarks?: string; receivedBy: string;
  student: {
    name: string; studentId: string; className: string;
    section: string; rollNumber: number;
    parentName: string; parentPhone: string;
  };
}

const PAYMENT_MODES = [
  { id: 'cash',       label: 'Cash',       icon: '💵' },
  { id: 'cheque',     label: 'Cheque',     icon: '📋' },
  { id: 'esewa',      label: 'eSewa',      icon: '🟣' },
  { id: 'khalti',     label: 'Khalti',     icon: '🟤' },
  { id: 'connectips', label: 'ConnectIPS', icon: '🏦' },
  { id: 'bank',       label: 'Bank',       icon: '🏧' },
];

const FEE_HEAD_LABELS: Record<string, string> = {
  tuition: 'Tuition', exam: 'Exam', library: 'Library',
  sports: 'Sports', lab: 'Lab', hostel: 'Hostel',
  uniform: 'Uniform', stationery: 'Stationery',
};

/* ─── helpers ───────────────────────────────────────────── */
function statusBadge(s: Invoice['status']) {
  const map = {
    pending:  'bg-amber-100 text-amber-700',
    partial:  'bg-blue-100 text-blue-700',
    overdue:  'bg-red-100 text-red-700',
    paid:     'bg-emerald-100 text-emerald-700',
  };
  return map[s] ?? 'bg-slate-100 text-slate-600';
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/* ═══════════════════════════════════════════════════════ */
export default function CollectPaymentPage() {
  const { user } = useAuthStore();

  /* search */
  const [query, setQuery]     = useState('');
  const debouncedQ            = useDebounce(query, 350);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [searching, setSearching] = useState(false);

  /* selected student + invoices */
  const [student,  setStudent]  = useState<StudentResult | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInv, setLoadingInv] = useState(false);

  /* payment form */
  const [selInvoice, setSelInvoice] = useState<Invoice | null>(null);
  const [payMode,    setPayMode]    = useState('cash');
  const [amount,     setAmount]     = useState('');
  const [txnId,      setTxnId]      = useState('');
  const [remarks,    setRemarks]    = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  /* receipt */
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  /* ── search ──────────────────────────────────────────── */
  useEffect(() => {
    if (debouncedQ.length < 2) { setResults([]); return; }
    setSearching(true);
    fetch(`/api/students/search?q=${encodeURIComponent(debouncedQ)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.students ?? []))
      .finally(() => setSearching(false));
  }, [debouncedQ]);

  /* ── load invoices for selected student ──────────────── */
  const selectStudent = useCallback(async (s: StudentResult) => {
    setStudent(s);
    setResults([]);
    setQuery('');
    setSelInvoice(null);
    setReceipt(null);
    setLoadingInv(true);

    const res  = await fetch(`/api/invoices?studentId=${s._id}&status=pending,partial,overdue`);
    const data = await res.json();
    const unpaid = (data.invoices ?? []).filter(
      (inv: Invoice) => inv.status !== 'paid'
    );
    setInvoices(unpaid);
    if (unpaid.length === 1) {
      selectInvoice(unpaid[0]);
    }
    setLoadingInv(false);
  }, []);

  const selectInvoice = (inv: Invoice) => {
    setSelInvoice(inv);
    const due = inv.totalAmount + inv.lateFine - inv.paidAmount;
    setAmount(String(Math.max(0, due)));
    setError('');
  };

  /* ── submit payment ──────────────────────────────────── */
  const handleSubmit = async () => {
    if (!selInvoice || !amount) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId:   selInvoice._id,
          amount:      Number(amount),
          paymentMode: payMode,
          transactionId: txnId || undefined,
          receivedBy:  receivedBy.trim() || user || 'Admin',
          remarks:     remarks || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Payment failed'); return; }

      setReceipt(data.receipt);
      // Refresh invoices
      const refresh = await fetch(`/api/invoices?studentId=${student!._id}`);
      const rdata   = await refresh.json();
      setInvoices((rdata.invoices ?? []).filter((i: Invoice) => i.status !== 'paid'));
      setSelInvoice(null);
      setTxnId('');
      setRemarks('');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── print receipt ───────────────────────────────────── */
  const printReceipt = () => {
    const win = window.open('', '_blank', 'width=780,height=900');
    if (!win || !printRef.current) return;
    win.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: system-ui, Arial, sans-serif; font-size: 13px; color: #0f172a; padding: 32px; line-height: 1.5; }
        h1 { font-size: 22px; margin: 0 0 4px; color: #0f172a; }
        h2 { color: #0f172a; }
        p, span, div { color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        td, th { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-weight: 600; }
        .text-emerald-700, .text-emerald-600 { color: #15803d; }
        .text-red-600, .text-red-500 { color: #dc2626; }
        .text-slate-400, .text-slate-500, .text-slate-600 { color: #334155 !important; }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  /* ── derived amounts ─────────────────────────────────── */
  const netPayable = selInvoice
    ? Math.max(0, selInvoice.totalAmount + selInvoice.lateFine - selInvoice.paidAmount)
    : 0;

  /* ═══════════════════════════════════════════════ render */
  return (
    <div className="max-w-screen-xl mx-auto space-y-6">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Collect Payment</h1>
        <p className="text-slate-400 text-sm mt-0.5">Search student → select invoice → record payment</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── Left: search + student card + invoices ───── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Search */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2 relative">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Find Student
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, ID, phone, class…"
                suppressHydrationWarning
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-slate-800"
              />
              {searching && (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
            </div>

            {/* Dropdown results */}
            {results.length > 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {results.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => selectStudent(s)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.className}-{s.section} • #{s.studentId}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Student card */}
          {student && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 text-xl font-bold flex items-center justify-center shrink-0">
                  {student.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">{student.name}</h2>
                  <p className="text-sm text-slate-500">{student.className}-{student.section} • Roll {student.rollNumber}</p>
                  <p className="text-xs text-slate-400 mt-0.5">ID: {student.studentId}</p>
                </div>
                <button
                  onClick={() => { setStudent(null); setInvoices([]); setSelInvoice(null); setReceipt(null); }}
                  className="ml-auto text-slate-400 hover:text-slate-600 text-lg"
                  title="Clear"
                >✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Parent', val: student.parentId?.name ?? '—' },
                  { label: 'Phone',  val: student.parentId?.phone ?? '—' },
                  { label: 'Hostel', val: student.hostelResident ? 'Yes' : 'No' },
                  { label: 'WhatsApp', val: student.parentId?.whatsappActivated ? '✅ Active' : '❌ Off' },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-slate-400 uppercase tracking-wide" style={{ fontSize: 10 }}>{label}</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices list */}
          {student && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pending Invoices</p>

              {loadingInv ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm">All dues cleared!</p>
                </div>
              ) : (
                invoices.map((inv) => {
                  const due = inv.totalAmount + inv.lateFine - inv.paidAmount;
                  const active = selInvoice?._id === inv._id;
                  return (
                    <button
                      key={inv._id}
                      onClick={() => selectInvoice(inv)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                        active
                          ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                          : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{inv.monthBS}</p>
                        <p className="text-xs text-slate-400">{inv.invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">₨ {due.toLocaleString('en-IN')}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(inv.status)}`}>
                          {inv.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Right: payment form ───────────────────────── */}
        <div className="xl:col-span-3 space-y-4">

          {!student && !receipt && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-base font-medium">Search for a student to begin</p>
              <p className="text-sm mt-1">Type a name, ID, phone, or class in the search box</p>
            </div>
          )}

          {/* Due Summary */}
          {selInvoice && !receipt && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <span>💳</span> Due Summary — {selInvoice.monthBS}
                </h3>

                {/* Fee heads breakdown */}
                <div className="space-y-1.5 text-slate-900">
                  {Object.entries(selInvoice.feeHeads ?? {}).map(([k, v]) =>
                    v > 0 ? (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-slate-800">{FEE_HEAD_LABELS[k] ?? k}</span>
                        <span className="font-semibold text-slate-900 tabular-nums">₨ {v.toLocaleString('en-IN')}</span>
                      </div>
                    ) : null
                  )}
                  {selInvoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Discount</span>
                      <span>− ₨ {selInvoice.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selInvoice.paidAmount > 0 && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Already Paid</span>
                      <span>− ₨ {selInvoice.paidAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selInvoice.lateFine > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Late Fine</span>
                      <span>+ ₨ {selInvoice.lateFine.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between font-bold text-base">
                    <span className="text-slate-800">Net Payable</span>
                    <span className="text-red-600">₨ {netPayable.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Payment form */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
                <h3 className="font-bold text-slate-900 text-base">Payment Details</h3>

                {/* Mode */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 block">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PAYMENT_MODES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setPayMode(m.id)}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-semibold transition-all ${
                          payMode === m.id
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:border-indigo-200'
                        }`}
                      >
                        <span className="text-xl">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 block">
                    Amount (₨)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={netPayable}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    suppressHydrationWarning
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xl font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  {amount && (
                    <p className="text-xs text-slate-700 mt-1">
                      {numberToWords(Number(amount))}
                    </p>
                  )}
                  {Number(amount) < netPayable && Number(amount) > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Partial payment — balance ₨ {(netPayable - Number(amount)).toLocaleString('en-IN')} remains
                    </p>
                  )}
                </div>

                {/* Transaction ID (non-cash) */}
                {payMode !== 'cash' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 block">
                      Transaction / Cheque No.
                    </label>
                    <input
                      value={txnId}
                      onChange={(e) => setTxnId(e.target.value)}
                      placeholder="Enter transaction reference"
                      suppressHydrationWarning
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 text-slate-800"
                    />
                  </div>
                )}

                {/* Received by */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 block">
                    Received By
                  </label>
                  <input
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder={user ?? 'Admin'}
                    suppressHydrationWarning
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 bg-white"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 block">
                    Remarks <span className="text-slate-600 normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    suppressHydrationWarning
                    placeholder="Any notes…"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-indigo-400 resize-none"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !amount || Number(amount) <= 0}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-base"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Processing…
                    </>
                  ) : '🧾 Collect & Generate Receipt'}
                </button>
              </div>
            </>
          )}

          {/* ── Receipt Preview ───────────────────────────── */}
          {receipt && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Success banner */}
              <div className="bg-emerald-500 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-bold text-lg">Payment Recorded!</p>
                    <p className="text-emerald-100 text-sm">
                      Receipt {receipt.receiptNumber}
                      {receipt.whatsappSent && ' · WhatsApp sent ✓'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setReceipt(null); setSelInvoice(null); }}
                  className="text-emerald-100 hover:text-white text-sm font-medium"
                >
                  New Payment →
                </button>
              </div>

              {/* Printable receipt — base text-slate-900 for strong contrast on white */}
              <div ref={printRef} className="p-6 space-y-5 text-slate-900">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">ShulkaPro School</h2>
                    <p className="text-slate-600 text-sm">Fee Payment Receipt</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 font-medium">Receipt No.</p>
                    <p className="font-bold text-slate-900 text-sm">{receipt.receiptNumber}</p>
                    <p className="text-xs text-slate-600 mt-1">Date: {receipt.paymentDate}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-200 py-4">
                  <div>
                    <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-0.5">Student</p>
                    <p className="font-bold text-slate-900">{receipt.student.name}</p>
                    <p className="text-sm text-slate-700">{receipt.student.className}-{receipt.student.section} • Roll {receipt.student.rollNumber}</p>
                    <p className="text-xs text-slate-600">ID: {receipt.student.studentId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-0.5">Parent</p>
                    <p className="font-semibold text-slate-900">{receipt.student.parentName}</p>
                    <p className="text-sm text-slate-700">{receipt.student.parentPhone}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Fee Breakdown — {receipt.monthBS}</p>
                  {Object.entries(receipt.feeHeads ?? {}).map(([k, v]) =>
                    v > 0 ? (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-slate-800">{FEE_HEAD_LABELS[k] ?? k}</span>
                        <span className="font-semibold text-slate-900 tabular-nums">₨ {v.toLocaleString('en-IN')}</span>
                      </div>
                    ) : null
                  )}
                  {receipt.lateFine > 0 && (
                    <div className="flex justify-between text-sm text-red-600 font-medium">
                      <span>Late Fine</span>
                      <span>₨ {receipt.lateFine.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <div className="flex justify-between font-bold text-base text-slate-900">
                      <span>Amount Paid</span>
                      <span className="text-emerald-700">₨ {receipt.amount.toLocaleString('en-IN')}</span>
                    </div>
                    {receipt.balance > 0 && (
                      <div className="flex justify-between text-sm text-red-600 mt-1 font-medium">
                        <span>Balance Due</span>
                        <span>₨ {receipt.balance.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 space-y-2 text-sm">
                  <div className="flex gap-4">
                    <span className="text-slate-700 w-28 shrink-0 font-semibold">Payment Mode</span>
                    <span className="font-semibold text-slate-900 capitalize">{receipt.paymentMode}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-slate-700 w-28 shrink-0 font-semibold">Received By</span>
                    <span className="font-semibold text-slate-900">{receipt.receivedBy}</span>
                  </div>
                  {receipt.remarks && (
                    <div className="flex gap-4">
                      <span className="text-slate-700 w-28 shrink-0 font-semibold">Remarks</span>
                      <span className="text-slate-900">{receipt.remarks}</span>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <span className="text-slate-700 w-28 shrink-0 font-semibold">Amount Words</span>
                    <span className="text-slate-800 text-xs not-italic leading-relaxed">{receipt.amountInWords}</span>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex items-center gap-4 bg-indigo-100/80 border border-indigo-200 rounded-xl px-4 py-3">
                  <QRCodeSVG
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/bill?sid=${encodeURIComponent(receipt.student.studentId)}`}
                    size={72}
                    bgColor="#ffffff"
                    fgColor="#1e1b4b"
                    level="M"
                    style={{ borderRadius: 8, flexShrink: 0 }}
                  />
                  <div>
                    <p className="text-xs font-bold text-indigo-950">Scan to view all bills</p>
                    <p className="text-xs text-indigo-800 mt-0.5">
                      Parent can scan this QR from any mobile — no login needed.
                    </p>
                    <p className="text-xs font-mono text-indigo-900 mt-1 break-all">
                      /bill?sid={receipt.student.studentId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="px-6 pb-6 flex flex-wrap gap-3">
                <button
                  onClick={printReceipt}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-sm transition-all"
                >
                  🖨️ Print Receipt
                </button>
                {receipt.whatsappSent ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium">
                    ✅ WhatsApp Sent
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      if (!student?.parentId?.callmebotApiKey) return;
                      await fetch('/api/notifications', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          type: 'payment-confirm',
                          invoiceId: receipt.invoiceId ?? selInvoice?._id,
                          amountPaid: receipt.amount,
                          receiptNumber: receipt.receiptNumber,
                        }),
                      });
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all"
                  >
                    💬 Send WhatsApp
                  </button>
                )}
                <button
                  onClick={() => { setReceipt(null); setSelInvoice(null); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all"
                >
                  ＋ New Payment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
