"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import StudentTable from "@/components/tables/StudentTable";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { Plus, Search, Download, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X } from "lucide-react";
import * as XLSX from "xlsx";

const CLASSES = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const SECTIONS = ["A", "B", "C", "D"];

// Expected Excel columns (case-insensitive match)
const COLUMN_MAP: Record<string, string> = {
  name: "name", "student name": "name", "full name": "name",
  class: "className", "class name": "className", classname: "className",
  section: "section",
  "roll no": "rollNumber", "roll number": "rollNumber", roll: "rollNumber",
  gender: "gender",
  dob: "dateOfBirth", "date of birth": "dateOfBirth", birthday: "dateOfBirth",
  "admission no": "admissionNumber", "admission number": "admissionNumber", "adm no": "admissionNumber",
  "admission date": "admissionDate",
  address: "address",
  "hostel resident": "hostelResident", hostel: "hostelResident",
  "parent name": "parentName", "father name": "parentName", "guardian name": "parentName",
  "parent phone": "parentPhone", "parent mobile": "parentPhone", "phone": "parentPhone", "mobile": "parentPhone",
  "parent address": "parentAddress",
};

interface ImportRowRaw {
  name?: string; className?: string; section?: string; rollNumber?: string | number;
  gender?: string; dateOfBirth?: string; admissionNumber?: string; admissionDate?: string;
  address?: string; hostelResident?: string | boolean;
  parentName?: string; parentPhone?: string; parentAddress?: string;
}

interface Student {
  _id: string;
  studentId: string;
  name: string;
  className: string;
  section: string;
  rollNumber: number;
  gender: string;
  hostelResident: boolean;
  status: string;
  parentId?: { name: string; phone: string };
}

const EMPTY_STUDENT_FORM = {
  name: "", className: "", section: "", rollNumber: 1, gender: "male",
  dateOfBirth: "", admissionDate: new Date().toISOString().split("T")[0],
  admissionNumber: "", address: "", hostelResident: false, transportRoute: "",
  parentData: { name: "", phone: "", address: "", whatsappEnabled: false, whatsappPhone: "" },
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_STUDENT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ImportRowRaw[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importStep, setImportStep] = useState<"idle" | "preview" | "uploading" | "done">("idle");
  const [importResult, setImportResult] = useState<{ created: number; updated?: number; skipped: number; errors: string[] } | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(search && { search }),
        ...(filterClass && { class: filterClass }),
        ...(filterSection && { section: filterSection }),
      });
      const res = await fetch(`/api/students?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students);
        setTotal(data.total);
        setPages(data.pages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, filterClass, filterSection]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Failed to add student"); return; }
      setShowModal(false);
      setForm(EMPTY_STUDENT_FORM);
      fetchStudents();
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      // Normalize keys using COLUMN_MAP
      const normalized = raw.map((row) => {
        const mapped: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row)) {
          const normalKey = COLUMN_MAP[key.toLowerCase().trim()];
          if (normalKey) mapped[normalKey] = val;
        }
        return mapped as ImportRowRaw;
      });
      setImportRows(normalized);
      setImportStep("preview");
      setShowImport(true);
      setImportResult(null);
    };
    reader.readAsArrayBuffer(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const handleImportSubmit = async () => {
    setImportStep("uploading");
    try {
      const payload = importRows.map((r) => ({
        name: String(r.name || ""),
        className: String(r.className || ""),
        section: String(r.section || ""),
        rollNumber: Number(r.rollNumber) || 0,
        gender: String(r.gender || "male").toLowerCase(),
        dateOfBirth: r.dateOfBirth ? String(r.dateOfBirth) : undefined,
        admissionNumber: r.admissionNumber ? String(r.admissionNumber) : undefined,
        admissionDate: r.admissionDate ? String(r.admissionDate) : undefined,
        address: String(r.address || ""),
        hostelResident: String(r.hostelResident || "").toLowerCase() === "yes",
        parentName: String(r.parentName || ""),
        parentPhone: String(r.parentPhone || ""),
        parentAddress: String(r.parentAddress || ""),
      }));
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const result = await res.json();
      setImportResult(result);
      setImportStep("done");
      if (result.created > 0) fetchStudents();
    } catch {
      setImportResult({ created: 0, skipped: importRows.length, errors: ["Network error. Please try again."] });
      setImportStep("done");
    }
  };

  const downloadTemplate = () => {
    const headers = [
      ["Name", "Class", "Section", "Roll No", "Gender", "Date of Birth", "Admission No",
       "Admission Date", "Address", "Hostel Resident", "Parent Name", "Parent Phone", "Parent Address"]
    ];
    const sample = [
      ["Ram Sharma", "5", "A", "1", "male", "2015-03-15", "ADM-2081-001",
       "2024-04-15", "Kathmandu", "No", "Hari Sharma", "+9779800000001", "Kathmandu"]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sample]);
    ws["!cols"] = headers[0].map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student-import-template.xlsx");
  };

  const closeImport = () => {
    setShowImport(false);
    setImportStep("idle");
    setImportRows([]);
    setImportFileName("");
    setImportResult(null);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      students.map((s) => ({
        "Student ID": s.studentId,
        Name: s.name,
        Class: s.className,
        Section: s.section,
        "Roll No": s.rollNumber,
        Gender: s.gender,
        "Hostel Resident": s.hostelResident ? "Yes" : "No",
        "Parent Name": s.parentId?.name || "",
        "Parent Phone": s.parentId?.phone || "",
        Status: s.status === "active" ? "Active" : "Inactive",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "students-list.xlsx");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Students</h1>
          <p className="text-slate-500 text-sm">{total} students enrolled</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download size={14} />
            <span className="hidden xs:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}
            className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-900/30">
            <Upload size={14} />
            <span className="hidden xs:inline">Import</span>
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Add Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            placeholder="Search by name, ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            suppressHydrationWarning
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 sm:gap-3">
          <select
            suppressHydrationWarning
            value={filterClass}
            onChange={(e) => { setFilterClass(e.target.value); setPage(1); }}
            className="flex-1 sm:flex-none px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Classes</option>
            {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
          </select>
          <select
            suppressHydrationWarning
            value={filterSection}
            onChange={(e) => { setFilterSection(e.target.value); setPage(1); }}
            className="flex-1 sm:flex-none px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Sections</option>
            {SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
      </div>

      <StudentTable
        students={students}
        total={total}
        page={page}
        pages={pages}
        onPageChange={setPage}
        loading={loading}
      />

      {/* Add Student Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setForm(EMPTY_STUDENT_FORM); setFormError(""); }}
        title="Add New Student"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Student full name" />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Class <span className="text-red-400">*</span></label>
              <select suppressHydrationWarning value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-800/50 text-slate-100 px-3 py-2.5 text-sm" required>
                <option value="">Select class</option>
                {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Section <span className="text-red-400">*</span></label>
              <select suppressHydrationWarning value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-800/50 text-slate-100 px-3 py-2.5 text-sm" required>
                <option value="">Select section</option>
                {SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
            <Input label="Roll Number" type="number" required value={form.rollNumber} onChange={(e) => setForm((f) => ({ ...f, rollNumber: parseInt(e.target.value) }))} min={1} />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Gender <span className="text-red-400">*</span></label>
              <select suppressHydrationWarning value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-800/50 text-slate-100 px-3 py-2.5 text-sm">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input label="Date of Birth" type="date" required value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
            <Input label="Admission Number" required value={form.admissionNumber} onChange={(e) => setForm((f) => ({ ...f, admissionNumber: e.target.value }))} placeholder="ADM-2081-001" />
            <Input label="Admission Date" type="date" required value={form.admissionDate} onChange={(e) => setForm((f) => ({ ...f, admissionDate: e.target.value }))} />
          </div>
          <Input label="Address" required value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Student permanent address" />

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.hostelResident} onChange={(e) => setForm((f) => ({ ...f, hostelResident: e.target.checked }))} className="rounded border-slate-600 bg-slate-800 text-blue-600 w-4 h-4" />
              Hostel Resident
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Parent / Guardian Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Parent Name" required value={form.parentData.name} onChange={(e) => setForm((f) => ({ ...f, parentData: { ...f.parentData, name: e.target.value } }))} />
              <Input label="Parent Phone" type="tel" required value={form.parentData.phone} onChange={(e) => setForm((f) => ({ ...f, parentData: { ...f.parentData, phone: e.target.value } }))} />
              <Input label="Parent Address" value={form.parentData.address} onChange={(e) => setForm((f) => ({ ...f, parentData: { ...f.parentData, address: e.target.value } }))} />
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer mt-6">
                  <input type="checkbox" checked={form.parentData.whatsappEnabled} onChange={(e) => setForm((f) => ({ ...f, parentData: { ...f.parentData, whatsappEnabled: e.target.checked } }))} className="rounded border-slate-600 bg-slate-800 text-blue-600 w-4 h-4" />
                  Enable WhatsApp Notifications
                </label>
                {form.parentData.whatsappEnabled && (
                  <Input placeholder="WhatsApp number" value={form.parentData.whatsappPhone} onChange={(e) => setForm((f) => ({ ...f, parentData: { ...f.parentData, whatsappPhone: e.target.value } }))} />
                )}
              </div>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{formError}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Add Student</Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <FileSpreadsheet size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Import Students from Excel</h2>
                  {importFileName && <p className="text-xs text-slate-400 mt-0.5">{importFileName}</p>}
                </div>
              </div>
              <button onClick={closeImport} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Step: Preview */}
              {(importStep === "preview" || importStep === "uploading") && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold text-white">{importRows.length}</span> rows found. Review before importing.
                    </p>
                    <button onClick={downloadTemplate}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors">
                      <Download size={12} /> Download template
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800">
                          {["#", "Name", "Class", "Section", "Roll", "Gender", "Parent Name", "Parent Phone", "Hostel"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-slate-400 font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 50).map((row, idx) => {
                          const missing = !row.name || !row.className || !row.section || !row.parentPhone;
                          return (
                            <tr key={idx} className={`border-t border-slate-800 ${missing ? "bg-red-950/30" : "hover:bg-slate-800/50"}`}>
                              <td className="px-3 py-2 text-slate-500">{idx + 2}</td>
                              <td className="px-3 py-2 text-slate-100 font-medium">{row.name || <span className="text-red-400">—</span>}</td>
                              <td className="px-3 py-2 text-slate-300">{row.className || <span className="text-red-400">—</span>}</td>
                              <td className="px-3 py-2 text-slate-300">{row.section || <span className="text-red-400">—</span>}</td>
                              <td className="px-3 py-2 text-slate-400">{String(row.rollNumber || "")}</td>
                              <td className="px-3 py-2 text-slate-400 capitalize">{row.gender || "male"}</td>
                              <td className="px-3 py-2 text-slate-300">{row.parentName}</td>
                              <td className="px-3 py-2 text-slate-300">{row.parentPhone || <span className="text-red-400">—</span>}</td>
                              <td className="px-3 py-2 text-slate-400">{String(row.hostelResident || "No")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {importRows.length > 50 && (
                      <div className="px-4 py-2 text-xs text-slate-500 bg-slate-800/50 border-t border-slate-700">
                        Showing first 50 of {importRows.length} rows
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
                    <p className="font-semibold">Required columns: Name, Class, Section, Parent Phone</p>
                    <p>Rows with missing required fields will be skipped. Red rows above have issues.</p>
                  </div>
                </>
              )}

              {/* Step: Done */}
              {importStep === "done" && importResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                      <CheckCircle size={24} className="text-emerald-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-emerald-400">{importResult.created}</div>
                      <div className="text-xs text-emerald-300 mt-1">Created</div>
                    </div>
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center">
                      <Upload size={24} className="text-indigo-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-indigo-400">{importResult.updated ?? 0}</div>
                      <div className="text-xs text-indigo-300 mt-1">Updated</div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                      <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-amber-400">{importResult.skipped}</div>
                      <div className="text-xs text-amber-300 mt-1">Skipped</div>
                    </div>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-center">
                      <FileSpreadsheet size={24} className="text-slate-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-300">{importRows.length}</div>
                      <div className="text-xs text-slate-400 mt-1">Total Rows</div>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-1 max-h-48 overflow-y-auto">
                      <p className="text-xs font-semibold text-red-400 mb-2">Issues ({importResult.errors.length})</p>
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-300">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button onClick={downloadTemplate}
                className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors">
                <Download size={14} /> Download template
              </button>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={closeImport}>
                  {importStep === "done" ? "Close" : "Cancel"}
                </Button>
                {importStep === "preview" && (
                  <Button onClick={handleImportSubmit}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    <Upload size={14} /> Import {importRows.length} Students
                  </Button>
                )}
                {importStep === "uploading" && (
                  <Button disabled className="bg-emerald-600/50 text-white cursor-not-allowed">
                    Importing...
                  </Button>
                )}
                {importStep === "done" && importResult && (importResult.created > 0 || (importResult.updated ?? 0) > 0) && (
                  <Button onClick={closeImport} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    <CheckCircle size={14} /> Done
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
