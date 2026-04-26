"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { BS_MONTHS_EN, getCurrentBSYear, getCurrentFiscalYear } from "@/lib/nepali-date";
import { FileText, CheckSquare, Square, AlertCircle } from "lucide-react";

interface Student {
  _id: string;
  studentId: string;
  name: string;
  className: string;
  section: string;
  rollNumber: number;
}

const CLASSES = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function GenerateBillsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ count: number; skipped?: number; errors?: string[] } | null>(null);
  const [error, setError] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<number | null>(null);

  const currentBsYear   = getCurrentBSYear();
  const currentFiscalYr = getCurrentFiscalYear();

  const [form, setForm] = useState({
    fiscalYear: currentFiscalYr,
    monthBS: BS_MONTHS_EN[new Date().getMonth()],
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString().split("T")[0],
    notes: "",
  });

  // Fiscal years with fee structures already configured
  const [feeYears, setFeeYears] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/fees")
      .then((r) => r.json())
      .then((d) => {
        const years: string[] = [...new Set((d.feeStructures ?? []).map((f: { fiscalYear: string }) => f.fiscalYear))] as string[];
        setFeeYears(years.sort());
      })
      .catch(() => {});
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (filterClass) params.set("class", filterClass);
      if (filterSection) params.set("section", filterSection);
      const res = await fetch(`/api/students?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students);
        setSelectedIds(data.students.map((s: Student) => s._id));
      }
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterSection]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const toggleAll = () => {
    setSelectedIds((ids) => ids.length === students.length ? [] : students.map((s) => s._id));
  };

  const toggleStudent = (id: string) => {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]);
  };

  const handleGenerate = async () => {
    if (!selectedIds.length) { setError("Select at least one student"); return; }
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedIds, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to generate bills"); return; }
      const count = data.created ?? data.count ?? 0;
      const skipped = data.skipped ?? 0;
      setResult({ count, skipped, errors: data.errors ?? [] });
      setSelectedIds([]);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Generate Bills</h1>
          <p className="text-slate-500 text-sm">Create monthly/periodic fee invoices for students</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={cleaning}
          onClick={async () => {
            if (!confirm("Delete all Rs 0 unpaid invoices? This cannot be undone.")) return;
            setCleaning(true);
            try {
              const res = await fetch("/api/invoices?voidZero=1", { method: "DELETE" });
              const d = await res.json();
              setCleanResult(d.deleted ?? 0);
            } finally {
              setCleaning(false);
            }
          }}
          className="border-red-600/40 text-red-400 hover:bg-red-900/20 whitespace-nowrap"
        >
          🗑 Clear Rs 0 Invoices
        </Button>
      </div>

      {cleanResult !== null && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
          Deleted {cleanResult} zero-amount invoice{cleanResult !== 1 ? "s" : ""}. Now set up fee structures and regenerate.
        </div>
      )}

      {/* Fee-structure warning */}
      {feeYears.length > 0 && !feeYears.includes(form.fiscalYear) ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-300 flex gap-2 items-start">
          <span className="shrink-0">⚠️</span>
          <span>
            No fee structure found for <strong>{form.fiscalYear}</strong>.
            Fee structures exist for: <strong>{feeYears.join(", ")}</strong>.{" "}
            Either select one of those years, or go to{" "}
            <a href="/fee-structure" className="underline font-semibold">Fee Structure</a>{" "}
            → use <strong>Duplicate</strong> to copy fees to {form.fiscalYear}.
          </span>
        </div>
      ) : (
        <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg text-sm text-blue-300 flex gap-2 items-start">
          <span className="shrink-0">ℹ️</span>
          <span>Make sure <strong>Fee Structures</strong> are configured for each class. Bills will be skipped for classes without a fee structure.</span>
        </div>
      )}

      {/* Config Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Bill Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">BS Month</label>
            <select
              value={form.monthBS}
              onChange={(e) => setForm((f) => ({ ...f, monthBS: e.target.value }))}
              suppressHydrationWarning
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 text-slate-100 px-3 py-2.5 text-sm"
            >
              {BS_MONTHS_EN.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Fiscal Year
              {feeYears.length > 0 && !feeYears.includes(form.fiscalYear) && (
                <span className="ml-2 text-xs text-amber-400">⚠ no fee structure</span>
              )}
            </label>
            <select
              value={form.fiscalYear}
              onChange={(e) => setForm((f) => ({ ...f, fiscalYear: e.target.value }))}
              suppressHydrationWarning
              className={`w-full rounded-lg border bg-slate-800/50 text-slate-100 px-3 py-2.5 text-sm
                ${feeYears.length > 0 && !feeYears.includes(form.fiscalYear)
                  ? 'border-amber-500/60'
                  : 'border-slate-700'
                }`}
            >
              {/* Always show years that have fee structures first */}
              {[...new Set([
                ...feeYears,
                `${currentBsYear - 2}/${String(currentBsYear - 1).slice(-2)}`,
                `${currentBsYear - 1}/${String(currentBsYear).slice(-2)}`,
                currentFiscalYr,
              ])].sort().map((y) => (
                <option key={y} value={y}>
                  {y}{feeYears.includes(y) ? " ✓" : ""}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Due Date"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
          />
          <Input
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Q2 payment"
          />
        </div>
      </div>

      {/* Student Selection */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex gap-3">
            <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); }} suppressHydrationWarning className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300">
              <option value="">All Classes</option>
              {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} suppressHydrationWarning className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300">
              <option value="">All Sections</option>
              {["A", "B", "C", "D"].map((s) => <option key={s} value={s}>Section {s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              {selectedIds.length}/{students.length} selected
            </span>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selectedIds.length === students.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No students found</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {students.map((student) => {
                  const isSelected = selectedIds.includes(student._id);
                  return (
                    <tr
                      key={student._id}
                      onClick={() => toggleStudent(student._id)}
                      className={`border-b border-slate-800 cursor-pointer transition-colors ${isSelected ? "bg-blue-500/10" : "hover:bg-slate-800/40"}`}
                    >
                      <td className="px-4 py-2.5 w-10">
                        {isSelected ? (
                          <CheckSquare size={16} className="text-blue-400" />
                        ) : (
                          <Square size={16} className="text-slate-600" />
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <p className="font-medium text-slate-200">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.studentId}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">
                        {student.className} - {student.section} / Roll #{student.rollNumber}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`p-4 rounded-xl border ${result.count > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
          {result.count > 0 && (
            <p className="text-emerald-400 font-semibold">
              ✅ {result.count} invoice{result.count !== 1 ? "s" : ""} generated successfully!
            </p>
          )}
          {(result.skipped ?? 0) > 0 && (
            <p className="text-amber-400 text-sm mt-1">
              ⚠️ {result.skipped} skipped (already exist or missing fee structure)
            </p>
          )}
          {(result.errors ?? []).length > 0 && (
            <div className="mt-2 space-y-1">
              {(result.errors ?? []).map((e, i) => (
                <p key={i} className="text-red-400 text-xs">{e}</p>
              ))}
            </div>
          )}
          {result.count > 0 && (
            <p className="text-emerald-600 text-sm mt-1">Bills are now available in the Collect Payment section.</p>
          )}
          {result.count === 0 && (result.errors?.some(e => e.includes('fee structure'))) && (
            <p className="text-amber-300 text-sm mt-2 font-medium">
              👉 Go to <a href="/fee-structure" className="underline">Fee Structure</a> and add fees for each class first.
            </p>
          )}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="lg" onClick={handleGenerate} loading={generating} disabled={!selectedIds.length}>
          <FileText size={16} />
          Generate {selectedIds.length} Invoice{selectedIds.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}
