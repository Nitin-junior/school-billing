'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { formatBSDate, getCurrentBSYear } from '@/lib/nepali-date';

const NAV = [
  { href: '/dashboard',       icon: '📊', label: 'Dashboard'       },
  { href: '/fee-structure',   icon: '💰', label: 'Fee Structure'   },
  { href: '/generate-bills',  icon: '🧾', label: 'Generate Bills'  },
  { href: '/invoices',        icon: '📋', label: 'Invoices'        },
  { href: '/collect-payment', icon: '💳', label: 'Collect Payment' },
  { href: '/due-fees',        icon: '⚠️',  label: 'Due Fees'       },
  { href: '/hostel-fees',     icon: '🏠', label: 'Hostel Fees'    },
  { href: '/notifications',   icon: '🔔', label: 'Notifications'  },
  { href: '/reports',         icon: '📈', label: 'Reports'        },
  { href: '/students',        icon: '👨‍🎓', label: 'Students'       },
  { href: '/settings',        icon: '⚙️',  label: 'Settings'       },
];

const TOP_NAV = [
  { href: '/dashboard',       label: 'Dashboard' },
  { href: '/collect-payment', label: 'Billing'   },
  { href: '/students',        label: 'Students'  },
  { href: '/reports',         label: 'Reports'   },
  { href: '/settings',        label: 'Settings'  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const router       = useRouter();
  const { user, role, clearAuth } = useAuthStore();
  const [mounted, setMounted]     = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const bsToday    = mounted ? formatBSDate(new Date()) : '';
  const bsYear     = mounted ? getCurrentBSYear() : 0;
  const fiscalYear = mounted ? `${bsYear}/${String(bsYear + 1).slice(-2)}` : '';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuth();
    router.push('/login');
  };

  const SidebarContent = () => (
    <nav className="flex flex-col gap-0.5 py-3 px-2">
      {NAV.map(({ href, icon, label }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-center text-xs font-medium transition-all
              ${active
                ? 'bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
              }`}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className="leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] overflow-hidden">

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header className="bg-[#1a1a2e] text-white shrink-0 z-30 shadow-lg">
        <div className="flex items-center h-14 px-3 sm:px-4 gap-3 sm:gap-6">

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth={1.8}>
                <path d="M12 3L2 9l10 6 10-6-10-6z"/>
                <path d="M2 17l10 6 10-6"/>
                <path d="M2 13l10 6 10-6"/>
              </svg>
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight">ShulkaPro</span>
          </div>

          {/* Desktop top nav links */}
          <nav className="hidden md:flex items-center gap-1 ml-2">
            {TOP_NAV.map(({ href, label }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link key={href} href={href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            {/* BS date + fiscal year */}
            <div className="hidden sm:flex flex-col items-end text-right" suppressHydrationWarning>
              <span className="text-xs text-slate-400" suppressHydrationWarning>{bsToday}</span>
              <span className="text-xs text-indigo-300 font-medium" suppressHydrationWarning>
                {fiscalYear ? `FY ${fiscalYear}` : ''}
              </span>
            </div>

            {/* Avatar + name */}
            <div className="flex items-center gap-2" suppressHydrationWarning>
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold uppercase shrink-0" suppressHydrationWarning>
                {mounted ? (user?.[0] ?? 'A') : 'A'}
              </div>
              <div className="hidden sm:block" suppressHydrationWarning>
                <p className="text-xs font-semibold text-white leading-none" suppressHydrationWarning>
                  {mounted ? (user ?? 'Admin') : 'Admin'}
                </p>
                <p className="text-xs text-slate-400 capitalize" suppressHydrationWarning>{mounted ? role : ''}</p>
              </div>
            </div>

            {/* Logout */}
            <button onClick={handleLogout} suppressHydrationWarning
              className="text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1 hover:bg-white/10 px-2 py-1.5 rounded-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-[140px] shrink-0 bg-[#1a1a2e] border-r border-white/5 overflow-y-auto">
          <SidebarContent />
        </aside>

        {/* Mobile Drawer overlay */}
        {drawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer panel */}
            <div className="relative w-[160px] bg-[#1a1a2e] h-full overflow-y-auto shadow-2xl border-r border-white/10 flex flex-col">
              {/* Close button */}
              <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Menu</span>
                <button onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-[#0f172a]">
          <div className="p-3 sm:p-4 md:p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Nav ──────────────────────────────────── */}
      <nav className="md:hidden shrink-0 bg-[#1a1a2e] border-t border-white/10 flex items-center justify-around px-2 py-1 z-20">
        {TOP_NAV.map(({ href, label }) => {
          const navItem = NAV.find(n => n.href === href);
          const active  = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-center transition-colors ${
                active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="text-base leading-none">{navItem?.icon}</span>
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
