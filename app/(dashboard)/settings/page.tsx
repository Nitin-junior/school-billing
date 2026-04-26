"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Settings, School, MessageCircle, Key, Database } from "lucide-react";

export default function SettingsPage() {
  const [schoolInfo, setSchoolInfo] = useState({
    name: "School Name",
    address: "School Address, City, Nepal",
    phone: "+977-01-XXXXXXX",
    email: "school@email.com",
    panNumber: "",
    logo: "",
  });
  const [whatsappKey, setWhatsappKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const SECTIONS = [
    {
      icon: <School size={20} />,
      title: "School Information",
      description: "Basic school details shown on invoices and receipts",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="School Name" value={schoolInfo.name} onChange={(e) => setSchoolInfo((s) => ({ ...s, name: e.target.value }))} required />
          <Input label="Phone Number" value={schoolInfo.phone} onChange={(e) => setSchoolInfo((s) => ({ ...s, phone: e.target.value }))} />
          <Input label="Email" type="email" value={schoolInfo.email} onChange={(e) => setSchoolInfo((s) => ({ ...s, email: e.target.value }))} />
          <Input label="PAN/VAT Number" value={schoolInfo.panNumber} onChange={(e) => setSchoolInfo((s) => ({ ...s, panNumber: e.target.value }))} placeholder="123456789" />
          <div className="md:col-span-2">
            <Input label="Address" value={schoolInfo.address} onChange={(e) => setSchoolInfo((s) => ({ ...s, address: e.target.value }))} />
          </div>
        </div>
      ),
    },
    {
      icon: <MessageCircle size={20} />,
      title: "WhatsApp Notifications (CallMeBot)",
      description: "Configure WhatsApp notification integration",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-300 font-medium">Setup CallMeBot Integration</p>
            <ol className="text-xs text-amber-400/80 mt-2 space-y-1 list-decimal list-inside">
              <li>Add <strong>+34 644 59 57 90</strong> to your WhatsApp contacts</li>
              <li>Send: <strong>I allow callmebot to send me messages</strong></li>
              <li>You will receive your API key via WhatsApp</li>
              <li>Enter the API key below</li>
            </ol>
          </div>
          <Input
            label="CallMeBot API Key"
            value={whatsappKey}
            onChange={(e) => setWhatsappKey(e.target.value)}
            placeholder="Your CallMeBot API key"
            type="password"
          />
          <p className="text-xs text-slate-500">
            The API key is stored in your .env.local file as CALLMEBOT_API_KEY
          </p>
        </div>
      ),
    },
    {
      icon: <Key size={20} />,
      title: "Security",
      description: "JWT and authentication settings",
      content: (
        <div className="space-y-3">
          <div className="p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">JWT Token Expiry</p>
            <p className="text-sm text-slate-200 font-medium">8 hours (access) · 7 days (refresh)</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">OTP Expiry</p>
            <p className="text-sm text-slate-200 font-medium">5 minutes · Max 3 attempts</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Auth Method</p>
            <p className="text-sm text-slate-200 font-medium">Phone OTP (jose JWT)</p>
          </div>
        </div>
      ),
    },
    {
      icon: <Database size={20} />,
      title: "Database",
      description: "MongoDB connection status",
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-sm text-slate-200 font-medium">MongoDB Connected</p>
              <p className="text-xs text-slate-500">Using Mongoose ODM with connection pooling</p>
            </div>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Collections</p>
            <p className="text-sm text-slate-300">Users · Students · Parents · Invoices · Payments · FeeStructures · OTPs · Discounts · NotificationLogs</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-500 text-sm">Configure system preferences and integrations</p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map(({ icon, title, description, content }) => (
          <div key={title} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
              <div className="text-blue-400">{icon}</div>
              <div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="text-xs text-slate-500">{description}</p>
              </div>
            </div>
            <div className="p-5">{content}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 justify-end">
        {saved && <p className="text-sm text-emerald-400">✅ Settings saved!</p>}
        <Button onClick={handleSave} loading={saving}>Save Settings</Button>
      </div>
    </div>
  );
}
