"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

/* ── types ────────────────────────────────────────────── */
interface FeeHeads { tuition:number; exam:number; library:number; sports:number; lab:number; hostel:number; uniform:number; stationery:number; }
interface Invoice {
  _id: string; invoiceNumber: string; fiscalYear: string;
  monthBS: string; dueDate: string; dueDateBS?: string;
  feeHeads: FeeHeads; totalAmount: number; paidAmount: number;
  lateFine: number; discount: number; dueAmount: number;
  status: string; createdAt: string;
}
interface Payment { receiptNumber: string; amount: number; paymentMode: string; paymentDateBS: string; }
interface StudentData {
  student: { _id:string; studentId:string; name:string; className:string; section:string; rollNumber:number; hostelResident:boolean; status:string; parent?: { name:string }; };
  invoices: Invoice[];
  payments: Payment[];
  summary: { totalBilled:number; totalPaid:number; totalDue:number; pendingCount:number; };
}

const FEE_LABELS: Record<string, string> = {
  tuition:"Tuition", exam:"Exam", library:"Library", sports:"Sports",
  lab:"Lab", hostel:"Hostel", uniform:"Uniform", stationery:"Stationery",
};

const STATUS_STYLE: Record<string, string> = {
  paid:    "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100  text-amber-700",
  partial: "bg-blue-100   text-blue-700",
  overdue: "bg-red-100    text-red-700",
};

function fmt(n: number) {
  return `Rs ${n.toLocaleString("en-IN")}`;
}

/* ── inner component (uses useSearchParams) ─────────── */
function BillViewer() {
  const params   = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);

  const [sid,       setSid]       = useState(params.get("sid") ?? "");
  const [input,     setInput]     = useState(params.get("sid") ?? "");
  const [data,      setData]      = useState<StudentData | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [openInv,   setOpenInv]   = useState<string | null>(null);

  // Auto-fetch if sid is in URL
  useEffect(() => {
    if (params.get("sid")) { handleSearch(params.get("sid")!); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(studentId?: string) {
    const q = (studentId ?? input).trim();
    if (!q) return;
    setSid(q);
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/public/bills?sid=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Not found"); return; }
      setData(json);
      // Update URL without reload
      window.history.replaceState(null, "", `/bill?sid=${encodeURIComponent(q)}`);
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head>
        <title>Bill — ${data?.student.name}</title>
        <style>
          body { font-family: sans-serif; font-size: 13px; color: #1e293b; margin: 24px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th,td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          th { background: #f8fafc; font-weight: 600; }
          .right { text-align: right; }
          .chip { display:inline-block; padding:2px 8px; border-radius:99px; font-size:11px; font-weight:600; }
          .paid    { background:#d1fae5; color:#065f46; }
          .pending { background:#fef3c7; color:#92400e; }
          .partial { background:#dbeafe; color:#1e40af; }
          .overdue { background:#fee2e2; color:#991b1b; }
        </style>
      </head><body>
        ${printRef.current.innerHTML}
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-indigo-700 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg font-bold">S</div>
          <div>
            <p className="font-bold text-base leading-tight">ShulkaPro</p>
            <p className="text-indigo-200 text-xs">Student Bill Viewer</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Enter Student ID to view bills</p>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. STU-00001 or 2026-CL1A-001"
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors"
            >
              {loading ? "..." : "View"}
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-1.5">
              <span>⚠</span> {error}
            </p>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="bg-white rounded-2xl p-4 h-28 border border-slate-200" />
            <div className="bg-white rounded-2xl p-4 h-44 border border-slate-200" />
          </div>
        )}

        {data && (
          <div ref={printRef} className="space-y-4">

            {/* Student card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold uppercase shrink-0">
                    {data.student.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-base">{data.student.name}</p>
                    <p className="text-xs text-slate-500">{data.student.className} — Section {data.student.section} · Roll #{data.student.rollNumber}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{data.student.studentId}</p>
                  </div>
                </div>
                <button
                  onClick={handlePrint}
                  className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  🖨 Print
                </button>
              </div>

              {/* Summary strips */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label: "Total Billed", value: fmt(data.summary.totalBilled), color: "bg-slate-50 text-slate-700" },
                  { label: "Total Paid",   value: fmt(data.summary.totalPaid),   color: "bg-emerald-50 text-emerald-700" },
                  { label: "Total Due",    value: fmt(data.summary.totalDue),    color: data.summary.totalDue > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700" },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-xl px-3 py-2 text-center ${color}`}>
                    <p className="text-[10px] uppercase tracking-wide opacity-70 font-medium">{label}</p>
                    <p className="text-sm font-bold mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoices list */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                Invoices ({data.invoices.length})
              </p>
              <div className="space-y-2">
                {data.invoices.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
                    No invoices found
                  </div>
                ) : data.invoices.map((inv) => (
                  <div key={inv._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Invoice header — always visible */}
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                      onClick={() => setOpenInv(openInv === inv._id ? null : inv._id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600">
                          {inv.monthBS.slice(0, 3)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{inv.monthBS} <span className="text-slate-400 font-normal text-xs">{inv.fiscalYear}</span></p>
                          <p className="text-xs text-slate-400 font-mono">{inv.invoiceNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_STYLE[inv.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {inv.status}
                        </span>
                        <span className="text-slate-400 text-xs">{openInv === inv._id ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {/* Expanded fee breakdown */}
                    {openInv === inv._id && (
                      <div className="border-t border-slate-100 px-4 pb-4">
                        <div className="mt-3 space-y-1.5">
                          {Object.entries(inv.feeHeads ?? {}).map(([k, v]) =>
                            v > 0 ? (
                              <div key={k} className="flex justify-between text-sm">
                                <span className="text-slate-500">{FEE_LABELS[k] ?? k}</span>
                                <span className="font-medium text-slate-700">{fmt(v)}</span>
                              </div>
                            ) : null
                          )}
                          {inv.lateFine > 0 && (
                            <div className="flex justify-between text-sm text-red-500">
                              <span>Late Fine</span>
                              <span>+ {fmt(inv.lateFine)}</span>
                            </div>
                          )}
                          {inv.discount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600">
                              <span>Discount</span>
                              <span>- {fmt(inv.discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-slate-100 font-bold text-slate-800">
                            <span>Net Payable</span>
                            <span>{fmt(inv.totalAmount + (inv.lateFine ?? 0) - (inv.discount ?? 0))}</span>
                          </div>
                          <div className="flex justify-between text-sm text-emerald-600">
                            <span>Paid</span>
                            <span>{fmt(inv.paidAmount)}</span>
                          </div>
                          {inv.dueAmount > 0 && (
                            <div className="flex justify-between text-sm font-bold text-red-500">
                              <span>Balance Due</span>
                              <span>{fmt(inv.dueAmount)}</span>
                            </div>
                          )}
                          <p className="text-xs text-slate-400 mt-2">Due date: {inv.dueDateBS ?? new Date(inv.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment history */}
            {data.payments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Payment History</p>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                  {data.payments.map((p) => (
                    <div key={p.receiptNumber} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{fmt(p.amount)}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.receiptNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 capitalize">{p.paymentMode}</p>
                        <p className="text-xs text-slate-400">{p.paymentDateBS}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center py-8 text-xs text-slate-400">
        Powered by ShulkaPro · Scan QR on your receipt to view bills
      </div>
    </div>
  );
}

/* ── page wrapper ─────────────────────────────────────── */
export default function BillPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    }>
      <BillViewer />
    </Suspense>
  );
}
