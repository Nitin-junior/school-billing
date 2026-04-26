'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type StepState = 'idle' | 'loading' | 'success' | 'error';

const STEPS = [
  {
    num: 1,
    icon: '📱',
    title: 'Save this contact in WhatsApp',
    body: (
      <div className="space-y-2">
        <p className="text-sm text-slate-600">Save the number below as <strong>CallMeBot</strong> in your phone contacts:</p>
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-2xl">💬</span>
          <div>
            <p className="font-bold text-green-800 text-lg tracking-widest">+34 698 36 91 74</p>
            <p className="text-xs text-green-600 mt-0.5">International WhatsApp number</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: 2,
    icon: '✍️',
    title: 'Send this exact message',
    body: (
      <div className="space-y-2">
        <p className="text-sm text-slate-600">Open WhatsApp, find CallMeBot, and send exactly:</p>
        <div className="bg-slate-800 rounded-xl px-4 py-3">
          <p className="text-green-400 font-mono text-sm select-all">
            I allow callmebot to send me messages
          </p>
        </div>
        <p className="text-xs text-slate-400">⚠️ The message must be word-for-word as above</p>
      </div>
    ),
  },
  {
    num: 3,
    icon: '📩',
    title: 'Receive your API key',
    body: (
      <div className="space-y-2">
        <p className="text-sm text-slate-600">CallMeBot will reply with your personal API key. It looks like:</p>
        <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
          <p className="font-mono text-slate-700 text-sm">API Authorized for phone +977XXXXXXXXXX.</p>
          <p className="font-mono text-slate-700 text-sm">Your APIKEY is <strong className="text-indigo-600">1234567</strong></p>
        </div>
        <p className="text-xs text-slate-500">Copy the numeric key from the reply message.</p>
      </div>
    ),
  },
];

export default function WhatsAppSetupPage() {
  const router = useRouter();
  const [apiKey,   setApiKey]   = useState('');
  const [status,   setStatus]   = useState<StepState>('idle');
  const [message,  setMessage]  = useState('');

  const handleActivate = async () => {
    if (!apiKey.trim()) {
      setStatus('error');
      setMessage('Please enter your API key');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res  = await fetch('/api/parent/activate-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Activation failed. Check your API key.');
        return;
      }

      setStatus('success');
      setMessage('WhatsApp activated! You will now receive fee notifications.');
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-[430px] mx-auto">

      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pt-10 pb-6 text-white">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-green-100 hover:text-white text-sm mb-4"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
            💬
          </div>
          <div>
            <h1 className="text-xl font-bold">WhatsApp Setup</h1>
            <p className="text-green-200 text-sm">Get fee alerts on WhatsApp</p>
          </div>
        </div>
      </div>

      {status === 'success' ? (
        <div className="p-6 text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto">
            ✅
          </div>
          <h2 className="text-xl font-bold text-slate-800">WhatsApp Activated!</h2>
          <p className="text-slate-500 text-sm">
            You will now receive fee reminders, payment confirmations, and due alerts on WhatsApp.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-700">
            A test message has been sent to your WhatsApp to confirm activation.
          </div>
          <button
            onClick={() => router.push('/parent')}
            className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
          >
            Go to Home
          </button>
        </div>
      ) : (
        <div className="p-5 space-y-5 pb-10">

          {/* Steps 1–3 */}
          {STEPS.map((step, idx) => (
            <div key={step.num} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {step.num}
                </div>
                <span className="text-lg">{step.icon}</span>
                <h3 className="font-semibold text-slate-800 text-sm">{step.title}</h3>
              </div>
              <div className="px-4 py-4">{step.body}</div>
            </div>
          ))}

          {/* Step 4 — Enter API key */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                4
              </div>
              <span className="text-lg">🔑</span>
              <h3 className="font-semibold text-slate-800 text-sm">Enter your API key</h3>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-slate-600">Paste the API key received from CallMeBot:</p>
              <input
                type="text"
                inputMode="numeric"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setStatus('idle');
                  setMessage('');
                }}
                placeholder="e.g. 1234567"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xl font-mono font-bold text-center text-indigo-700 tracking-widest outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />

              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  ❌ {message}
                </div>
              )}

              <button
                onClick={handleActivate}
                disabled={status === 'loading' || !apiKey.trim()}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-base"
              >
                {status === 'loading' ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Activating…
                  </>
                ) : '✅ Save & Activate'}
              </button>

              <p className="text-xs text-slate-400 text-center">
                A test message will be sent to verify your API key works
              </p>
            </div>
          </div>

          {/* Help */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">⚠️ Trouble getting the API key?</p>
            <ul className="space-y-1 text-xs text-amber-700 list-disc pl-4">
              <li>Make sure you sent the exact message to +34 698 36 91 74</li>
              <li>Wait a few minutes for the reply</li>
              <li>Check your WhatsApp spam/blocked list</li>
              <li>Contact school admin if issues persist</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
