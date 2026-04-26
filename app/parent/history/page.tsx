"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/pdf";
import { formatADDate } from "@/lib/nepali-date";

interface Payment {
  _id: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  bsDate?: string;
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In real app, fetch from API with parent session
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 py-4 mb-4">
        <Link href="/parent" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-white">Payment History</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-900 rounded-xl h-20" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Receipt size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No payment records</p>
          <p className="text-sm">Your payment history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p._id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-white">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{p.receiptNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-400 capitalize">{p.paymentMethod.replace("-", " ")}</p>
                  <p className="text-xs text-slate-600">{formatADDate(new Date(p.paymentDate))}</p>
                </div>
              </div>
              {p.bsDate && (
                <p className="text-xs text-slate-600 mt-2">BS: {p.bsDate}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
