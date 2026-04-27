'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, Role } from '@/store/useAuthStore';

/* ─── helpers ─────────────────────────────────────────── */
function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}
function rawDigits(formatted: string) {
  return formatted.replace(/\D/g, '');
}
function isValidPhone(digits: string) {
  return /^98\d{8}$/.test(digits);
}

/* ─── types ────────────────────────────────────────────── */
type Step = 'phone' | 'otp';

const ROLES: { label: string; value: Role }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Teacher', value: 'teacher' },
  { label: 'Parent', value: 'parent' },
];

const OTP_LENGTH = 6;
const RESEND_SECONDS = 120;

/* ═══════════════════════════════════════════════════════ */
export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  /* role / phone */
  const [role, setRole] = useState<Role>('admin');
  const [phoneFormatted, setPhoneFormatted] = useState('');
  const [phoneError, setPhoneError] = useState('');

  /* step */
  const [step, setStep] = useState<Step>('phone');
  const [sendLoading, setSendLoading] = useState(false);

  /* OTP */
  const [devOtp, setDevOtp] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* WhatsApp setup modal */
  const [showSetup, setShowSetup] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState('');

  /* ── countdown timer ── */
  useEffect(() => {
    if (step !== 'otp') return;
    setCountdown(RESEND_SECONDS);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  const fullPhone = '+977' + rawDigits(phoneFormatted);

  /* ── send OTP ── */
  const handleSendOTP = async () => {
    const digits10 = rawDigits(phoneFormatted);
    if (!isValidPhone(digits10)) {
      setPhoneError('Enter a valid 10-digit Nepali mobile number starting with 98');
      return;
    }
    setPhoneError('');
    setSendLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      if (res.status === 404) { setPhoneError(data.error); return; }
      if (data.setup) { setShowSetup(true); return; }
      if (!res.ok) { setPhoneError(data.error || 'Failed to send OTP'); return; }
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch {
      setPhoneError('Network error. Check your connection.');
    } finally {
      setSendLoading(false);
    }
  };

  /* ── OTP digit input ── */
  const handleDigit = (index: number, value: string) => {
    const ch = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = ch;
    setDigits(next);
    setOtpError('');
    if (ch && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
    if (next.every((d) => d) && ch) submitOTP(next.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = [...Array(OTP_LENGTH).fill('')];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIdx]?.focus();
    if (pasted.length === OTP_LENGTH) submitOTP(pasted);
  };

  /* ── verify OTP ── */
  const submitOTP = useCallback(async (code: string) => {
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, otp: code, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Verification failed');
        setDigits(Array(OTP_LENGTH).fill(''));
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
        return;
      }
      setAuth(data.name || fullPhone, role, fullPhone);
      router.push(role === 'parent' ? '/parent' : '/dashboard');
    } catch {
      setOtpError('Network error. Try again.');
    } finally {
      setOtpLoading(false);
    }
  }, [fullPhone, role, router, setAuth]);

  /* ── resend ── */
  const handleResend = () => {
    setDigits(Array(OTP_LENGTH).fill(''));
    setOtpError('');
    setStep('phone');
    setTimeout(() => handleSendOTP(), 50);
  };

  /* ── activate WhatsApp ── */
  const handleActivate = async () => {
    if (!apiKey.trim()) { setActivateError('Please enter your CallMeBot API key'); return; }
    setActivating(true);
    setActivateError('');
    try {
      const res = await fetch('/api/parent/activate-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setActivateError(data.error || 'Activation failed'); return; }
      setShowSetup(false);
      setApiKey('');
      await handleSendOTP();
    } catch {
      setActivateError('Network error.');
    } finally {
      setActivating(false);
    }
  };

  const timerLabel = countdown > 0
    ? `Resend OTP in ${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')}`
    : null;

  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get('error');
    if (err) {
      const map: Record<string, string> = {
        google_not_configured: 'Google Sign-In is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment.',
        google_access_denied: 'Google sign-in was cancelled.',
        google_parent_email_not_registered: 'This Google account email is not linked to a parent record. Ask the school to add your email in the parent profile, or use WhatsApp OTP instead.',
        google_staff_email_not_registered: 'This Google account email is not in the school staff list. Use the email registered in the system, or use phone OTP.',
        google_token_failed: 'Could not complete Google sign-in. Try again or use phone OTP.',
        google_no_email: 'Your Google account has no email. Use a different account or phone OTP.',
        google_invalid_state: 'Session expired. Please try Google sign-in again.',
        google_missing_code: 'Google did not return a code. Please try again.',
      };
      setUrlError(map[err] ?? `Sign-in error: ${err.replace(/^google_/, '')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  /* ═══════════════ RENDER ═══════════════════════════════ */
  return (
    <div className="min-h-screen w-full bg-[#0f0f1e] flex items-center justify-center relative overflow-hidden">

      {/* ── Decorative background blobs ─────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-700/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-purple-700/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-indigo-900/40 rounded-full blur-3xl" />
        {/* Grid dots */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
      </div>

      {/* ── Login card ──────────────────────────────────── */}
      <div className="relative w-full max-w-md mx-4 sm:mx-auto">

        {/* Logo + title above card */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-900/60 mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9" stroke="white" strokeWidth={1.6}>
              <path d="M12 3L2 9l10 6 10-6-10-6z"/>
              <path d="M2 17l10 6 10-6"/>
              <path d="M2 13l10 6 10-6"/>
            </svg>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">ShulkaPro</h1>
          <p className="text-indigo-300/80 text-sm mt-1">School Billing System · Nepal</p>
        </div>

        {/* White card */}
        <div className="bg-white rounded-2xl px-6 pt-7 pb-8 shadow-2xl shadow-black/40">

        {/* Role Selector */}
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1 mb-8">
          {ROLES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRole(value)}
              suppressHydrationWarning
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                role === value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {urlError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {urlError}
          </div>
        )}

        {step === 'phone' ? (
          /* ── Phone step ─────────────────────────────── */
          <div className="space-y-5">
            <a
              href={`/api/auth/google?role=${role}`}
              className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white py-3.5 font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </a>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              or use phone & WhatsApp
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Mobile Number
              </label>
              <div className={`flex items-center rounded-xl border-2 overflow-hidden transition-colors ${
                phoneError ? 'border-red-400' : 'border-slate-200 focus-within:border-indigo-500'
              }`}>
                {/* Prefix */}
                <div className="flex items-center gap-2 px-3 py-3.5 bg-slate-50 border-r border-slate-200 shrink-0 select-none">
                  <span className="text-xl">🇳🇵</span>
                  <span className="text-sm font-semibold text-slate-600">+977</span>
                </div>
                {/* Input */}
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="98X-XXX-XXXX"
                  suppressHydrationWarning
                  value={phoneFormatted}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhoneFormatted(formatPhone(raw));
                    setPhoneError('');
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendOTP(); }}
                  className="flex-1 px-4 py-3.5 text-slate-800 text-base font-medium outline-none bg-transparent placeholder-slate-300"
                />
              </div>
              {phoneError && (
                <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  {phoneError}
                </p>
              )}
            </div>

            <button
              onClick={handleSendOTP}
              disabled={sendLoading || !rawDigits(phoneFormatted)}
              suppressHydrationWarning
              className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-base transition-all duration-200 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
            >
              {sendLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Sending…
                </>
              ) : (
                <>Send OTP via WhatsApp 💬</>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 mt-2">
              OTP will be sent to your WhatsApp number
            </p>
          </div>

        ) : (
          /* ── OTP step ───────────────────────────────── */
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-slate-500 text-sm">OTP sent to WhatsApp</p>
              <p className="text-slate-800 font-bold text-base mt-0.5">+977 {phoneFormatted}</p>
              <button
                onClick={() => { setStep('phone'); setDigits(Array(OTP_LENGTH).fill('')); setOtpError(''); }}
                className="text-indigo-600 text-xs font-medium mt-1 hover:underline"
              >
                Change number
              </button>
            </div>

            {/* 6 OTP boxes */}
            <div
              className="flex gap-2.5 justify-center"
              onPaste={handlePaste}
            >
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={otpLoading}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all duration-150
                    ${d ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-800'}
                    focus:border-indigo-500 focus:bg-indigo-50
                    disabled:opacity-50`}
                />
              ))}
            </div>

            {/* Dev OTP hint */}
            {devOtp && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-center">
                <p className="text-xs text-amber-600 font-medium">🛠️ Dev Mode — OTP is</p>
                <p className="text-2xl font-bold text-amber-700 tracking-widest mt-0.5">{devOtp}</p>
              </div>
            )}

            {/* OTP error */}
            {otpError && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                otpError.includes('expired') ? 'bg-orange-50 text-orange-600 border border-orange-200'
                  : otpError.includes('many') ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                <span className="text-base">{otpError.includes('expired') ? '⏱️' : '❌'}</span>
                {otpError}
              </div>
            )}

            {/* Loading indicator */}
            {otpLoading && (
              <div className="flex items-center justify-center gap-2 text-indigo-600 text-sm font-medium">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Verifying…
              </div>
            )}

            {/* Resend timer */}
            <div className="text-center">
              {timerLabel ? (
                <p className="text-slate-400 text-sm">{timerLabel}</p>
              ) : (
                <button
                  onClick={handleResend}
                  className="text-indigo-600 text-sm font-semibold hover:underline"
                >
                  🔄 Resend OTP
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-8">
          ShulkaPro v1.0 · Secure Login
        </p>
        </div>{/* end white card */}
      </div>{/* end max-w container */}

      {/* ═══ WhatsApp Setup Modal ═══════════════════════════ */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSetup(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="bg-emerald-500 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div>
                  <h2 className="text-white font-bold text-base">Activate WhatsApp</h2>
                  <p className="text-emerald-100 text-xs">One-time setup · Takes 2 minutes</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Steps */}
              {[
                {
                  n: 1,
                  text: 'Save this number as "CallMeBot" in your WhatsApp contacts:',
                  extra: (
                    <div className="mt-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-700 text-sm select-all">
                      +34 644 61 35 28
                    </div>
                  ),
                },
                {
                  n: 2,
                  text: 'Send this exact message to CallMeBot on WhatsApp:',
                  extra: (
                    <div className="mt-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-700 text-xs select-all">
                      I allow callmebot to send me messages
                    </div>
                  ),
                },
                {
                  n: 3,
                  text: 'You will receive an API key from CallMeBot. Enter it below:',
                  extra: null,
                },
              ].map(({ n, text, extra }) => (
                <div key={n} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {n}
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-600 text-sm">{text}</p>
                    {extra}
                  </div>
                </div>
              ))}

              {/* API Key input */}
              <div>
                <input
                  type="text"
                  placeholder="Paste your CallMeBot API key"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setActivateError(''); }}
                  className="w-full border-2 border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-colors text-slate-800 placeholder-slate-300"
                />
                {activateError && (
                  <p className="mt-1.5 text-xs text-red-500">{activateError}</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowSetup(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActivate}
                  disabled={activating || !apiKey.trim()}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  {activating ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Activating…
                    </>
                  ) : (
                    '✅ Activate WhatsApp'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
