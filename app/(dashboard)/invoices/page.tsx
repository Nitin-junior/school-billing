"use client";

import { useState, useCallback, useEffect } from "react";
import Badge, { getStatusVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Search, Trash2, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/pdf";
import { formatADDate } from "@/lib/nepali-date";
import * as XLSX from "xlsx";

const CLASSES = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const BS_MONTHS = ["Baisakh","Jestha","Ashadh","Shrawan","Bhadra","Ashwin","Kartik","Mangsir","Poush","Magh","Falgun","Chaitra"];

interface Invoice {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  lateFine: number;
  status: string;
  dueDate: string;
  monthBS: string;
  fiscalYear: string;
  feeHeads?: Record<string, number>;
  studentId: {
    _id: string;
    name: string;
    studentId: string;
    className: string;
    section: string;
    rollNumber: number;
  };
}

export default function InvoicesPage() {
  const [invoices, setInvoices]     = useState<Invoice[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [loading, setLoading]       = useState(true);

  // Filters
  const [search, setSearch]         = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);
  const [deletingZero, setDeletingZero] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filterClass)  params.set("class",      filterClass);
      if (filterMonth)  params.set("monthBS",     filterMonth);
      if (filterStatus) params.set("status",      filterStatus);
      if (filterYear)   params.set("fiscalYear",  filterYear);

      const res = await fetch(`/api/invoices?${params}`);
      if (res.ok) {
        const data = await res.json();
        let list: Invoice[] = data.invoices ?? [];

        // Client-side search filter (name / invoiceNumber / studentId)
        if (search.trim()) {
          const q = search.toLowerCase();
          list = list.filter((inv) =>
            inv.studentId?.name?.toLowerCase().includes(q) ||
            inv.studentId?.studentId?.toLowerCase().includes(q) ||
            inv.invoiceNumber?.toLowerCase().includes(q)
          );
        }

        setInvoices(list);
        setTotal(data.total ?? list.length);
        setPages(data.pages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterClass, filterMonth, filterStatus, filterYear, search]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleDelete = async (inv: Invoice) => {
    setDeletingId(inv._id);
    try {
      const res = await fetch(`/api/invoices?id=${inv._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Delete failed"); return; }
      setDeleteConfirm(null);
      fetchInvoices();
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllZero = async () => {
    if (!confirm("Delete ALL Rs 0 unpaid invoices? This cannot be undone.")) return;
    setDeletingZero(true);
    try {
      const res = await fetch("/api/invoices?voidZero=1", { method: "DELETE" });
      const data = await res.json();
      alert(`Deleted ${data.deleted ?? 0} zero-amount invoice(s).`);
      fetchInvoices();
    } finally {
      setDeletingZero(false);
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      invoices.map((inv) => ({
        "Invoice No":  inv.invoiceNumber,
        "Student":     inv.studentId?.name,
        "Student ID":  inv.studentId?.studentId,
        "Class":       inv.studentId?.className,
        "Month":       inv.monthBS,
        "Fiscal Year": inv.fiscalYear,
        "Total (Rs)":  inv.totalAmount,
        "Paid (Rs)":   inv.paidAmount,
        "Due (Rs)":    Math.max(0, inv.totalAmount + inv.lateFine - inv.paidAmount),
        "Status":      inv.status,
        "Due Date":    formatADDate(new Date(inv.dueDate)),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, "invoices-export.xlsx");
  };

  const zeroCount = invoices.filter((i) => i.totalAmount === 0 && i.paidAmount === 0).length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-slate-400 text-sm">{total} invoices total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {zeroCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              loading={deletingZero}
              onClick={handleDeleteAllZero}
              className="border-red-600/40 text-red-400 hover:bg-red-900/20"
            >
              <Trash2 size={13} />
              Delete {zeroCount} Rs 0 Bills
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchInvoices()}>
            <RefreshCw size={13} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download size={13} /> Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            placeholder="Search name, ID, invoice no..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            suppressHydrationWarning
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select suppressHydrationWarning value={filterClass}
          onChange={(e) => { setFilterClass(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300">
          <option value="">All Classes</option>
          {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select suppressHydrationWarning value={filterMonth}
          onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300">
          <option value="">All Months</option>
          {BS_MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select suppressHydrationWarning value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
        </select>
        <select suppressHydrationWarning value={filterYear}
          onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300">
          <option value="">All Years</option>
          {["2080/81","2081/82","2082/83"].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Zero-amount warning */}
      {zeroCount > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-sm">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>
            <strong>{zeroCount}</strong> invoice{zeroCount > 1 ? "s have" : " has"} Rs 0 amount — likely generated before fee structures were set up.
            Click <strong>"Delete {zeroCount} Rs 0 Bills"</strong> above to remove them, then set up fee structures and regenerate.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/60 border-b border-slate-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Student</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoice</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Month</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Due</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Due Date</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <p className="text-slate-500">No invoices found</p>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const dueAmt = Math.max(0, inv.totalAmount + (inv.lateFine ?? 0) - inv.paidAmount);
                const isZero = inv.totalAmount === 0 && inv.paidAmount === 0;
                return (
                  <tr key={inv._id}
                    className={`hover:bg-slate-800/40 transition-colors ${isZero ? "bg-red-900/10" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{inv.studentId?.name}</p>
                      <p className="text-xs text-slate-500">{inv.studentId?.studentId} · {inv.studentId?.className}-{inv.studentId?.section}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-slate-400">{inv.invoiceNumber}</p>
                      <p className="text-xs text-slate-600">{inv.fiscalYear}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{inv.monthBS}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${isZero ? "text-red-400" : "text-slate-200"}`}>
                        {formatCurrency(inv.totalAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(inv.paidAmount)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-400">{formatCurrency(dueAmt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(inv.status)} dot>{inv.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatADDate(new Date(inv.dueDate))}</td>
                    <td className="px-4 py-3">
                      {inv.paidAmount === 0 && (
                        <button
                          onClick={() => setDeleteConfirm(inv)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          title="Delete invoice"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Delete Invoice</h3>
                <p className="text-xs text-slate-400">This cannot be undone</p>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 mb-5 space-y-1 text-sm">
              <p className="text-slate-300"><span className="text-slate-500">Invoice:</span> {deleteConfirm.invoiceNumber}</p>
              <p className="text-slate-300"><span className="text-slate-500">Student:</span> {deleteConfirm.studentId?.name}</p>
              <p className="text-slate-300"><span className="text-slate-500">Month:</span> {deleteConfirm.monthBS}</p>
              <p className="text-slate-300"><span className="text-slate-500">Amount:</span> {formatCurrency(deleteConfirm.totalAmount)}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 border-red-600"
                loading={deletingId === deleteConfirm._id}
                onClick={() => handleDelete(deleteConfirm)}
              >
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
