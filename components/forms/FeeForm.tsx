"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Plus, Trash2 } from "lucide-react";

interface FeeComponent {
  name: string;
  amount: number;
  isOptional: boolean;
  description?: string;
}

interface FeeFormData {
  class: string;
  academicYear: string;
  term: string;
  feeComponents: FeeComponent[];
  hostelFee: number;
  lateFine: number;
  lateFineAfterDays: number;
  dueDay: number;
}

interface FeeFormProps {
  initialData?: Partial<FeeFormData>;
  onSubmit: (data: FeeFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "Nursery", "LKG", "UKG"];
const COMMON_FEES = ["Tuition Fee", "Exam Fee", "Library Fee", "Lab Fee", "Sports Fee", "Computer Fee", "Development Fee"];

export default function FeeForm({ initialData, onSubmit, onCancel, loading }: FeeFormProps) {
  const [form, setForm] = useState<FeeFormData>({
    class: initialData?.class || "",
    academicYear: initialData?.academicYear || "2081/2082",
    term: initialData?.term || "monthly",
    feeComponents: initialData?.feeComponents || [{ name: "Tuition Fee", amount: 0, isOptional: false }],
    hostelFee: initialData?.hostelFee || 0,
    lateFine: initialData?.lateFine || 50,
    lateFineAfterDays: initialData?.lateFineAfterDays || 15,
    dueDay: initialData?.dueDay || 10,
  });

  const addComponent = () => {
    setForm((f) => ({
      ...f,
      feeComponents: [...f.feeComponents, { name: "", amount: 0, isOptional: false }],
    }));
  };

  const removeComponent = (index: number) => {
    setForm((f) => ({
      ...f,
      feeComponents: f.feeComponents.filter((_, i) => i !== index),
    }));
  };

  const updateComponent = (index: number, field: keyof FeeComponent, value: string | number | boolean) => {
    setForm((f) => {
      const updated = [...f.feeComponents];
      (updated[index] as unknown as Record<string, unknown>)[field] = value;
      return { ...f, feeComponents: updated };
    });
  };

  const totalFee = form.feeComponents.filter((c) => !c.isOptional).reduce((sum, c) => sum + (c.amount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Class <span className="text-red-400">*</span></label>
          <select
            value={form.class}
            onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 text-slate-100 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            required
          >
            <option value="">Select Class</option>
            {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Academic Year <span className="text-red-400">*</span></label>
          <select
            value={form.academicYear}
            onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 text-slate-100 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            {["2080/2081", "2081/2082", "2082/2083"].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Billing Term</label>
          <select
            value={form.term}
            onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 text-slate-100 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="half-yearly">Half Yearly</option>
            <option value="annually">Annually</option>
          </select>
        </div>
        <Input
          label="Due Day of Month"
          type="number"
          min={1} max={28}
          value={form.dueDay}
          onChange={(e) => setForm((f) => ({ ...f, dueDay: parseInt(e.target.value) }))}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200">Fee Components</h3>
          <Button type="button" variant="outline" size="sm" onClick={addComponent}>
            <Plus size={14} /> Add Component
          </Button>
        </div>
        <div className="space-y-2">
          {form.feeComponents.map((comp, index) => (
            <div key={index} className="flex gap-2 items-start p-3 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <select
                    value={comp.name}
                    onChange={(e) => updateComponent(index, "name", e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-100 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select or type...</option>
                    {COMMON_FEES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <input
                    placeholder="Or type custom name"
                    value={comp.name}
                    onChange={(e) => updateComponent(index, "name", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/50 text-slate-100 px-2 py-1.5 text-sm placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Amount (Rs.)"
                  value={comp.amount || ""}
                  onChange={(e) => updateComponent(index, "amount", parseFloat(e.target.value) || 0)}
                  leftIcon={<span className="text-xs">Rs.</span>}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={comp.isOptional}
                    onChange={(e) => updateComponent(index, "isOptional", e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-blue-600"
                  />
                  Optional
                </label>
                {form.feeComponents.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeComponent(index)}>
                    <Trash2 size={14} className="text-red-400" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-end">
          <span className="text-sm text-slate-400">Total Required: <span className="text-white font-semibold">Rs. {totalFee.toLocaleString()}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Hostel Fee (Rs.)"
          type="number"
          value={form.hostelFee || ""}
          onChange={(e) => setForm((f) => ({ ...f, hostelFee: parseFloat(e.target.value) || 0 }))}
          placeholder="0"
        />
        <Input
          label="Late Fine (Rs.)"
          type="number"
          value={form.lateFine}
          onChange={(e) => setForm((f) => ({ ...f, lateFine: parseFloat(e.target.value) || 0 }))}
        />
        <Input
          label="Fine After Days"
          type="number"
          value={form.lateFineAfterDays}
          onChange={(e) => setForm((f) => ({ ...f, lateFineAfterDays: parseInt(e.target.value) || 0 }))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          {initialData?.class ? "Update Fee Structure" : "Create Fee Structure"}
        </Button>
      </div>
    </form>
  );
}
