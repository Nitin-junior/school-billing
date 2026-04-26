'use client';

import useSWR, { mutate } from 'swr';
import { useState, useRef, useCallback } from 'react';
import { getCurrentFiscalYear } from '@/lib/nepali-date';

/* ─── types ────────────────────────────────────────────── */
interface FeeRow {
  _id?: string;
  className: string;
  tuition: number;
  exam: number;
  library: number;
  sports: number;
  lab: number;
  hostel: number;
  uniform: number;
  stationery: number;
  cycle: 'monthly' | 'quarterly' | 'annual';
  fiscalYear: string;
  lateFinePerDay: number;
  isNew?: boolean;
  isDirty?: boolean;
}

type FeeField = keyof Omit<FeeRow, '_id' | 'isNew' | 'isDirty'>;

const FEE_HEADS: { key: keyof FeeRow; label: string }[] = [
  { key: 'tuition',    label: 'Tuition'    },
  { key: 'exam',       label: 'Exam'       },
  { key: 'library',    label: 'Library'    },
  { key: 'sports',     label: 'Sports'     },
  { key: 'lab',        label: 'Lab'        },
  { key: 'hostel',     label: 'Hostel'     },
  { key: 'uniform',    label: 'Uniform'    },
  { key: 'stationery', label: 'Stationery' },
];

const CYCLES = ['monthly', 'quarterly', 'annual'] as const;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DEFAULT_YEAR = getCurrentFiscalYear();

function rowTotal(row: FeeRow) {
  return FEE_HEADS.reduce((s, h) => s + (Number(row[h.key]) || 0), 0);
}

/* ─── inline editable cell ─────────────────────────────── */
function EditCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => {
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0) onChange(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        suppressHydrationWarning
        type="number"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-full bg-indigo-50 border border-indigo-400 rounded px-1.5 py-1 text-sm text-indigo-800 font-medium outline-none text-right"
      />
    );
  }

  return (
    <button
      onClick={start}
      title="Click to edit"
      className="w-full text-right text-sm text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded px-1.5 py-1 transition-colors font-medium"
    >
      {value > 0 ? value.toLocaleString('en-IN') : <span className="text-slate-300">—</span>}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function FeeStructurePage() {
  const [fiscalYear, setFiscalYear] = useState(DEFAULT_YEAR);
  const { data, isLoading } = useSWR<{ feeStructures: FeeRow[] }>(
    `/api/fees?fiscalYear=${fiscalYear}`,
    fetcher
  );

  const [rows, setRows] = useState<FeeRow[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [dupFrom, setDupFrom] = useState('2081/82');
  const [duplicating, setDuplicating] = useState(false);
  const [dupMsg, setDupMsg] = useState('');

  // Initialize rows from fetched data
  if (!isLoading && data && !initialized) {
    setRows(data.feeStructures.map((r) => ({ ...r, isDirty: false })));
    setInitialized(true);
  }

  // Reset when fiscal year changes
  const handleYearChange = (y: string) => {
    setFiscalYear(y);
    setInitialized(false);
    setRows([]);
  };

  const updateRow = useCallback((idx: number, field: FeeField, val: number | string) => {
    setRows((prev) => {
      const next = [...prev];
      (next[idx] as unknown as Record<string, unknown>)[field] = val;
      next[idx].isDirty = true;
      return next;
    });
  }, []);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        className: '',
        tuition: 0, exam: 0, library: 0, sports: 0,
        lab: 0, hostel: 0, uniform: 0, stationery: 0,
        cycle: 'monthly',
        fiscalYear,
        lateFinePerDay: 50,
        isNew: true,
        isDirty: true,
      },
    ]);
  };

  const saveAll = async () => {
    const dirty = rows.filter((r) => r.isDirty);
    if (!dirty.length) { setSaveMsg('Nothing to save'); return; }

    setSaving(true);
    setSaveMsg('');
    try {
      await Promise.all(
        dirty.map((row) =>
          fetch('/api/fees', {
            method: row._id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...row, fiscalYear }),
          })
        )
      );
      setSaveMsg(`✅ Saved ${dirty.length} row${dirty.length > 1 ? 's' : ''}`);
      mutate(`/api/fees?fiscalYear=${fiscalYear}`);
      setInitialized(false);
    } catch {
      setSaveMsg('❌ Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const duplicateYear = async () => {
    setDuplicating(true);
    setDupMsg('');
    try {
      const res = await fetch('/api/fees/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromYear: dupFrom, toYear: fiscalYear }),
      });
      const d = await res.json();
      if (!res.ok) { setDupMsg(`❌ ${d.error}`); return; }
      setDupMsg(`✅ Duplicated ${d.count} rows from ${dupFrom}`);
      mutate(`/api/fees?fiscalYear=${fiscalYear}`);
      setInitialized(false);
    } finally {
      setDuplicating(false);
    }
  };

  // Summary stats
  const totalStudentFeeAvg =
    rows.length ? Math.round(rows.reduce((s, r) => s + rowTotal(r), 0) / rows.length) : 0;

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fee Structure</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Click any cell to edit · Changes saved to MongoDB
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Fiscal year */}
          <select suppressHydrationWarning value={fiscalYear} onChange={(e) => handleYearChange(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 shadow-sm"
          >
            {['2079/80', '2080/81', '2081/82', '2082/83', '2083/84'].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Duplicate */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-slate-500 whitespace-nowrap">Copy from</span>
            <select suppressHydrationWarning value={dupFrom} onChange={(e) => setDupFrom(e.target.value)}
              className="text-sm text-slate-700 outline-none bg-transparent"
            >
              {['2079/80', '2080/81', '2081/82', '2082/83'].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={duplicateYear}
              disabled={duplicating || dupFrom === fiscalYear}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 whitespace-nowrap"
            >
              {duplicating ? '⏳' : '📋 Duplicate'}
            </button>
          </div>
          {dupMsg && <span className="text-xs font-medium text-slate-600">{dupMsg}</span>}

          {/* Add row */}
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            ＋ Add Class
          </button>

          {/* Save */}
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-60"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Saving…
              </>
            ) : '💾 Save All'}
          </button>
        </div>
      </div>

      {saveMsg && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
          saveMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {saveMsg}
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Classes Configured', val: rows.length, color: 'blue' },
          { label: 'Avg Fee / Student',  val: `₨ ${totalStudentFeeAvg.toLocaleString('en-IN')}`, color: 'indigo' },
          { label: 'Unsaved Changes',    val: rows.filter((r) => r.isDirty).length, color: 'amber' },
        ].map(({ label, val, color }) => (
          <div key={label} className={`rounded-xl border p-4 text-center
            ${color === 'blue'   ? 'bg-blue-50   border-blue-200'   : ''}
            ${color === 'indigo' ? 'bg-indigo-50 border-indigo-200' : ''}
            ${color === 'amber'  ? 'bg-amber-50  border-amber-200'  : ''}
          `}>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-bold mt-0.5
              ${color === 'blue'   ? 'text-blue-700'   : ''}
              ${color === 'indigo' ? 'text-indigo-700' : ''}
              ${color === 'amber'  ? 'text-amber-700'  : ''}
            `}>{val}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide sticky left-0 bg-slate-50 z-10 min-w-[110px]">
                  Class
                </th>
                {FEE_HEADS.map(({ key, label }) => (
                  <th key={key} className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[90px]">
                    {label}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[110px]">
                  Cycle
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[80px]">
                  Late/Day
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide min-w-[100px] bg-indigo-50">
                  Total ₨
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3 sticky left-0 bg-white">
                      <div className="h-4 bg-slate-100 rounded w-20" />
                    </td>
                    {FEE_HEADS.map((h) => (
                      <td key={h.key} className="px-3 py-3">
                        <div className="h-4 bg-slate-100 rounded" />
                      </td>
                    ))}
                    <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded" /></td>
                    <td className="px-3 py-3 bg-indigo-50"><div className="h-4 bg-indigo-100 rounded" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={FEE_HEADS.length + 4} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <span className="text-4xl">📋</span>
                      <p className="text-sm font-medium">No fee structures for {fiscalYear}</p>
                      <p className="text-xs">Add a class row or duplicate from last year</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`group transition-colors ${
                      row.isDirty ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Class name */}
                    <td className="px-4 py-2 sticky left-0 bg-inherit z-10">
                      <input
                        suppressHydrationWarning
                        value={row.className}
                        onChange={(e) => updateRow(idx, 'className', e.target.value)}
                        placeholder="e.g. Class 9"
                        className="w-full bg-transparent font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 rounded px-1"
                      />
                      {row.isDirty && (
                        <span className="text-xs text-amber-500 font-medium">unsaved</span>
                      )}
                    </td>

                    {/* Fee head cells */}
                    {FEE_HEADS.map(({ key }) => (
                      <td key={key} className="px-3 py-2">
                        <EditCell
                          value={Number(row[key]) || 0}
                          onChange={(v) => updateRow(idx, key as FeeField, v)}
                        />
                      </td>
                    ))}

                    {/* Billing cycle */}
                    <td className="px-3 py-2">
                      <select suppressHydrationWarning value={row.cycle || 'monthly'} onChange={(e) => updateRow(idx, 'cycle', e.target.value)}
                        className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-indigo-400"
                      >
                        {CYCLES.map((c) => (
                          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                    </td>

                    {/* Late fine per day */}
                    <td className="px-3 py-2">
                      <EditCell
                        value={row.lateFinePerDay}
                        onChange={(v) => updateRow(idx, 'lateFinePerDay', v)}
                      />
                    </td>

                    {/* Row total (read-only) */}
                    <td className="px-3 py-2 bg-indigo-50 text-right">
                      <span className="font-bold text-indigo-700 text-sm">
                        ₨ {rowTotal(row).toLocaleString('en-IN')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Totals footer */}
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800 text-white">
                  <td className="px-4 py-3 font-bold text-sm sticky left-0 bg-slate-800 z-10">
                    AVERAGE
                  </td>
                  {FEE_HEADS.map(({ key }) => {
                    const avg = rows.length
                      ? Math.round(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0) / rows.length)
                      : 0;
                    return (
                      <td key={key} className="px-3 py-3 text-right text-xs text-slate-300 font-medium">
                        {avg > 0 ? avg.toLocaleString('en-IN') : '—'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 bg-indigo-900 text-right font-bold">
                    ₨ {totalStudentFeeAvg.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Expected revenue hint */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-3.5 flex flex-wrap items-center gap-6 text-sm shadow-sm">
          <span className="text-slate-500">📊 Expected monthly revenue</span>
          {rows.map((r) => (
            <span key={r.className} className="font-medium text-slate-700">
              <span className="text-slate-400 font-normal">{r.className}:</span>{' '}
              ₨ {rowTotal(r).toLocaleString('en-IN')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
