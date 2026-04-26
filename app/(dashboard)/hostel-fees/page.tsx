"use client";

import { useState, useEffect, useCallback } from "react";
import Badge, { getStatusVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Building2, Download } from "lucide-react";
import { formatCurrency } from "@/lib/pdf";
import { formatADDate } from "@/lib/nepali-date";
import * as XLSX from "xlsx";

interface InvoiceWithStudent {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
  monthBS?: string;
  fiscalYear: string;
  feeHeads?: { hostel?: number };
  studentId: {
    name: string;
    studentId: string;
    className: string;
    hostelRoom?: string;
  };
}

export default function HostelFeesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState("2081/82");

  const fetchHostelInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?fiscalYear=${fiscalYear}&limit=200`);
      if (res.ok) {
        const data = await res.json();
        // Filter invoices that have a hostel fee component
        const hostelInvoices = (data.invoices as InvoiceWithStudent[]).filter(
          (inv) => (inv.feeHeads?.hostel ?? 0) > 0
        );
        setInvoices(hostelInvoices);
      }
    } finally {
      setLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => { fetchHostelInvoices(); }, [fetchHostelInvoices]);

  const summary = {
    total: invoices.length,
    collected: invoices.reduce((s, i) => s + i.paidAmount, 0),
    due: invoices.reduce((s, i) => s + Math.max(0, i.totalAmount - i.paidAmount), 0),
    paid: invoices.filter((i) => i.status === "paid").length,
  };

  const exportHostel = () => {
    const ws = XLSX.utils.json_to_sheet(
      invoices.map((inv) => ({
        Student: inv.studentId?.name,
        "Student ID": inv.studentId?.studentId,
        Class: inv.studentId?.className,
        "Hostel Room": inv.studentId?.hostelRoom || "",
        Month: inv.monthBS || "",
        "Invoice No": inv.invoiceNumber,
        "Total Amount": inv.totalAmount,
        Paid: inv.paidAmount,
        Due: Math.max(0, inv.totalAmount - inv.paidAmount),
        Status: inv.status,
        "Due Date": formatADDate(new Date(inv.dueDate)),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hostel Fees");
    XLSX.writeFile(wb, `hostel-fees-${fiscalYear.replace("/", "-")}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Hostel Fees</h1>
          <p className="text-slate-500 text-sm">Manage hostel resident fee collection</p>
        </div>
        <div className="flex gap-2">
          <select suppressHydrationWarning value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300"
          >
            {["2080/81", "2081/82", "2082/83"].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={exportHostel}>
            <Download size={14} /> Export
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: String(summary.total), color: "blue" },
          { label: "Total Collected", value: `Rs.${(summary.collected / 1000).toFixed(0)}k`, color: "green" },
          { label: "Total Due", value: `Rs.${(summary.due / 1000).toFixed(0)}k`, color: "red" },
          { label: "Paid", value: String(summary.paid), color: "green" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`stat-gradient-${color === "blue" ? "blue" : color === "green" ? "green" : "red"} rounded-xl p-4`}>
            <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-xl font-bold text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/60 border-b border-slate-700">
              {["Student", "Room", "Month", "Total", "Paid", "Due", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <Building2 size={32} className="mx-auto mb-2 text-slate-700" />
                  <p className="text-slate-500">No hostel fee invoices found</p>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-100">{inv.studentId?.name}</p>
                    <p className="text-xs text-slate-500">{inv.studentId?.studentId} · {inv.studentId?.className}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{inv.studentId?.hostelRoom || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{inv.monthBS || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-emerald-400">{formatCurrency(inv.paidAmount)}</td>
                  <td className="px-4 py-3 text-red-400 font-semibold">{formatCurrency(Math.max(0, inv.totalAmount - inv.paidAmount))}</td>
                  <td className="px-4 py-3">
                    <Badge variant={getStatusVariant(inv.status)} dot>{inv.status}</Badge>
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
