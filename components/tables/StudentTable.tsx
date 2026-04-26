"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Eye, Edit, Trash2, GraduationCap } from "lucide-react";

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

interface StudentTableProps {
  students: Student[];
  total: number;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  onEdit?: (student: Student) => void;
  onView?: (student: Student) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-t border-slate-800">
      {Array.from({ length: 5 }).map((_, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-slate-800/50 rounded-xl p-4 space-y-2 border border-slate-700/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-700" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-slate-700 rounded w-2/3" />
          <div className="h-3 bg-slate-800 rounded w-1/3" />
        </div>
      </div>
      <div className="h-3 bg-slate-800 rounded w-1/2" />
    </div>
  );
}

function Pagination({ page, pages, total, onPageChange }: {
  page: number; pages: number; total: number; onPageChange: (p: number) => void;
}) {
  if (pages <= 1) return null;
  const visiblePages = Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1);
  return (
    <div className="px-4 py-3 border-t border-slate-700 flex flex-wrap items-center justify-between gap-2 bg-slate-800/30">
      <p className="text-xs text-slate-500">
        {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} students
      </p>
      <div className="flex gap-1 items-center">
        <Button variant="ghost" size="icon" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          <ChevronLeft size={14} />
        </Button>
        {visiblePages.map((p) => (
          <Button key={p} variant={page === p ? "primary" : "ghost"} size="icon"
            onClick={() => onPageChange(p)} className="w-8 h-8 text-xs">
            {p}
          </Button>
        ))}
        <Button variant="ghost" size="icon" onClick={() => onPageChange(page + 1)} disabled={page === pages}>
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

export default function StudentTable({
  students, total, page, pages, onPageChange, onEdit, onView, onDelete, loading,
}: StudentTableProps) {
  const isActive = (s: Student) => s.status === "active";

  return (
    <div className="rounded-xl border border-slate-700 overflow-hidden">

      {/* ── Desktop table (md+) ─────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/60 border-b border-slate-700">
              {["Student", "Class", "Parent", "Status", "Actions"].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${i === 4 ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              : students.length === 0
              ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <GraduationCap size={36} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-500 text-sm">No students found</p>
                  </td>
                </tr>
              )
              : students.map((s) => (
                <tr key={s._id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                        {s.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-100 leading-tight">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-300 text-sm">Class {s.className} — {s.section}</p>
                    <p className="text-xs text-slate-500">Roll #{s.rollNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    {s.parentId ? (
                      <>
                        <p className="text-sm text-slate-300">{s.parentId.name}</p>
                        <p className="text-xs text-slate-500">{s.parentId.phone}</p>
                      </>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 w-fit">
                      <Badge variant={isActive(s) ? "success" : "danger"} size="sm">
                        {isActive(s) ? "Active" : s.status}
                      </Badge>
                      {s.hostelResident && <Badge variant="info" size="sm">Hostel</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onView   && <Button variant="ghost" size="icon" onClick={() => onView(s)}><Eye size={14}/></Button>}
                      {onEdit   && <Button variant="ghost" size="icon" onClick={() => onEdit(s)}><Edit size={14}/></Button>}
                      {onDelete && <Button variant="ghost" size="icon" onClick={() => onDelete(s._id)}><Trash2 size={14} className="text-red-400"/></Button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards (< md) ─────────────────────────────── */}
      <div className="md:hidden divide-y divide-slate-800/80">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3"><SkeletonCard /></div>
            ))
          : students.length === 0
          ? (
            <div className="py-14 text-center">
              <GraduationCap size={36} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No students found</p>
            </div>
          )
          : students.map((s) => (
            <div key={s._id} className="p-3 hover:bg-slate-800/30 transition-colors">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-300 flex items-center justify-center text-sm font-bold shrink-0">
                  {s.name[0]?.toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-slate-100 text-sm leading-tight">{s.name}</p>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant={isActive(s) ? "success" : "danger"} size="sm">
                        {isActive(s) ? "Active" : s.status}
                      </Badge>
                      {s.hostelResident && <Badge variant="info" size="sm">Hostel</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{s.studentId}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                    <span className="text-xs text-slate-400">
                      <span className="text-slate-500">Class</span> {s.className}-{s.section} · Roll #{s.rollNumber}
                    </span>
                    {s.parentId && (
                      <span className="text-xs text-slate-400">
                        <span className="text-slate-500">Parent:</span> {s.parentId.name}
                      </span>
                    )}
                  </div>
                </div>
                {/* Action dots */}
                <div className="flex gap-1 shrink-0">
                  {onView   && <Button variant="ghost" size="icon" onClick={() => onView(s)} className="w-8 h-8"><Eye size={13}/></Button>}
                  {onEdit   && <Button variant="ghost" size="icon" onClick={() => onEdit(s)} className="w-8 h-8"><Edit size={13}/></Button>}
                  {onDelete && <Button variant="ghost" size="icon" onClick={() => onDelete(s._id)} className="w-8 h-8"><Trash2 size={13} className="text-red-400"/></Button>}
                </div>
              </div>
            </div>
          ))}
      </div>

      <Pagination page={page} pages={pages} total={total} onPageChange={onPageChange} />
    </div>
  );
}
