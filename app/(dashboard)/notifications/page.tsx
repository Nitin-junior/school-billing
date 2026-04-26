"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Badge, { getStatusVariant } from "@/components/ui/Badge";
import { Bell, Send, MessageCircle } from "lucide-react";
import { formatADDateTime } from "@/lib/nepali-date";

interface NotificationLog {
  _id: string;
  type: string;
  channel: string;
  status: string;
  message: string;
  parentPhone: string;
  sentAt?: string;
  createdAt: string;
  studentId?: { name: string; class: string };
}

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"logs" | "send">("send");
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=30");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const sendNotification = async (type: string) => {
    setSending(type);
    setSendResult(null);
    try {
      const body: Record<string, unknown> = { type };
      if (type === "custom") body.customMessage = customMessage;

      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setSendResult(data.results);
        fetchLogs();
      }
    } finally {
      setSending(null);
    }
  };

  const notifTypes = [
    {
      key: "payment-reminder",
      label: "Payment Reminder",
      description: "Send reminders to parents with pending invoices",
      icon: <Bell size={20} />,
      color: "amber",
    },
    {
      key: "due-alert",
      label: "Due Alert",
      description: "Alert parents with overdue fee payments",
      icon: <MessageCircle size={20} />,
      color: "red",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-slate-500 text-sm">Send WhatsApp notifications to parents via CallMeBot</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {[{ key: "send" as const, label: "Send Notifications" }, { key: "logs" as const, label: `Notification Logs (${total})` }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "send" ? (
        <div className="space-y-4">
          {/* Notification Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notifTypes.map(({ key, label, description, icon, color }) => (
              <div key={key} className={`bg-slate-900 border rounded-xl p-5 ${color === "amber" ? "border-amber-500/20" : "border-red-500/20"}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color === "amber" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                  {icon}
                </div>
                <h3 className="font-semibold text-white">{label}</h3>
                <p className="text-sm text-slate-400 mt-1 mb-4">{description}</p>
                <Button
                  size="sm"
                  variant={color === "amber" ? "warning" : "danger"}
                  onClick={() => sendNotification(key)}
                  loading={sending === key}
                  className="w-full"
                >
                  <Send size={14} /> Send to All
                </Button>
              </div>
            ))}
          </div>

          {/* Custom Message */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-3">Custom Message</h3>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              suppressHydrationWarning
              placeholder="Type your custom message here... Supports WhatsApp markdown (*bold*, _italic_)"
              rows={5}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 text-slate-100 px-3 py-2.5 text-sm placeholder-slate-600 focus:border-blue-500 focus:outline-none resize-none"
            />
            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-slate-600">{customMessage.length} characters</p>
              <Button
                size="sm"
                onClick={() => sendNotification("custom")}
                loading={sending === "custom"}
                disabled={!customMessage.trim()}
              >
                <Send size={14} /> Send Custom Message
              </Button>
            </div>
          </div>

          {sendResult && (
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl">
              <h4 className="text-sm font-semibold text-white mb-2">Send Results:</h4>
              <div className="flex gap-6 text-sm">
                <span className="text-emerald-400">✅ Sent: {sendResult.sent}</span>
                <span className="text-red-400">❌ Failed: {sendResult.failed}</span>
                <span className="text-slate-500">⏭️ Skipped: {sendResult.skipped}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-700">
                {["Student", "Type", "Phone", "Channel", "Status", "Sent At"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No notifications sent yet
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-slate-200">{log.studentId?.name || "—"}</p>
                      <p className="text-xs text-slate-500">{log.studentId?.class ? `Class ${log.studentId.class}` : ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info" size="sm">{log.type.replace(/-/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{log.parentPhone}</td>
                    <td className="px-4 py-3">
                      <Badge variant="default" size="sm">{log.channel}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(log.status)} dot>{log.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {log.sentAt ? formatADDateTime(new Date(log.sentAt)) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
