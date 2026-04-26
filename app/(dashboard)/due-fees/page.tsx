"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Badge, { getStatusVariant } from "@/components/ui/Badge";
import { AlertTriangle, Download, Bell, Search } from "lucide-react";
import { formatCurrency } from "@/lib/pdf";
import { formatADDate } from "@/lib/nepali-date";
import * as XLSX from "xlsx";

interface DueInvoice {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  lateFine: number;
  status: string;
  dueDate: string;
  monthBS?: string;
  fiscalYear: string;
  studentId: {
    _id: string;
    name: string;
    studentId: string;
    className: string;
    section: string;
    rollNumber: number;
    parentId?: { name: string; phone: string };
  };
}

export default function DueFeesPage() {
  const [invoices, setInvoices] = useState<DueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [fiscalYear, setFiscalYear] = useState("2081/82");

  const fetchDues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=due-list&fiscalYear=${fiscalYear}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } finally {
      setLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => { fetchDues(); }, [fetchDues]);

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      inv.studentId?.name?.toLowerCase().includes(s) ||
      inv.studentId?.studentId?.toLowerCase().includes(s) ||
      inv.invoiceNumber.toLowerCase().includes(s)
    );
  });

  const totalDue = filtered.reduce((sum, inv) => sum + (inv.dueAmount ?? Math.max(0, inv.totalAmount - inv.paidAmount)), 0);
  const overdueCount = filtered.filter((i) => i.status === "overdue").length;

  const sendReminders = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "payment-reminder" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSendResult(data.results);
      }
    } finally {
      setSending(false);
    }
  };

  const exportDues = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((inv) => ({
        "Invoice No": inv.invoiceNumber,
        "Student Name": inv.studentId?.name,
        "Student ID": inv.studentId?.studentId,
        Class: `${inv.studentId?.className}-${inv.studentId?.section}`,
        "Roll No": inv.studentId?.rollNumber,
        "Parent Phone": inv.studentId?.parentId?.phone || "",
        Month: inv.monthBS || "",
        "Total Amount": inv.totalAmount,
        "Due Amount": inv.dueAmount,
        "Late Fine": inv.lateFine,
        Status: inv.status,
        "Due Date": formatADDate(new Date(inv.dueDate)),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Due Fees");
    XLSX.writeFile(wb, `due-fees-${fiscalYear.replace("/", "-")}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Due Fees</h1>
          <p className="text-slate-500 text-sm">{filtered.length} invoices with outstanding dues</p>
        </div>
        <div className="flex gap-2">
          <select suppressHydrationWarning value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300"
          >
            {["2080/81", "2081/82", "2082/83"].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={exportDues}>
            <Download size={14} /> Export
          </Button>
          <Button variant="warning" size="sm" onClick={sendReminders} loading={sending}>
            <Bell size={14} /> Send Reminders
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-gradient-red rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Total Due</p>
          <p className="text-xl font-bold text-white mt-1">{formatCurrency(totalDue)}</p>
        </div>
        <div className="stat-gradient-amber rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Due Invoices</p>
          <p className="text-xl font-bold text-white mt-1">{filtered.length}</p>
        </div>
        <div className="stat-gradient-red rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Overdue</p>
          <p className="text-xl font-bold text-white mt-1">{overdueCount}</p>
        </div>
      </div>

      {sendResult && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm">
          <p className="text-emerald-400">
            Sent: {sendResult.sent} · Failed: {sendResult.failed}
          </p>
        </div>
      )}

      {/* Filter */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          placeholder="Search student..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          suppressHydrationWarning
          className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Due Table */}
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/60 border-b border-slate-700">
              {["Student", "Class", "Invoice", "Total", "Due", "Status", "Due Date", "Parent"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <AlertTriangle size={32} className="mx-auto mb-2 text-emerald-400/50" />
                  <p className="text-slate-500">No due fees found!</p>
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv._id} className={`hover:bg-slate-800/40 transition-colors ${inv.status === "overdue" ? "bg-red-500/5" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-100">{inv.studentId?.name}</p>
                    <p className="text-xs text-slate-500">{inv.studentId?.studentId}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {inv.studentId?.className}-{inv.studentId?.section}
                    <br />Roll #{inv.studentId?.rollNumber}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-slate-400">{inv.invoiceNumber}</p>
                    {inv.monthBS && <p className="text-xs text-slate-600">{inv.monthBS}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-4 py-3 font-bold text-red-400">{formatCurrency(inv.dueAmount ?? Math.max(0, inv.totalAmount - inv.paidAmount))}</td>
                  <td className="px-4 py-3">
                    <Badge variant={getStatusVariant(inv.status)} dot>{inv.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatADDate(new Date(inv.dueDate))}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-400">{inv.studentId?.parentId?.name}</p>
                    <p className="text-xs text-slate-600">{inv.studentId?.parentId?.phone}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
