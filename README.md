# School Billing & Fee Management System

A full-stack Progressive Web App (PWA) for school fee management with Nepali calendar (BS/AD) support, WhatsApp notifications, PDF receipts, and Excel exports.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | MongoDB + Mongoose |
| Styling | Tailwind CSS v4 |
| PWA | next-pwa (Workbox) |
| State | Zustand |
| Auth | jose (JWT) + Phone OTP |
| PDF | @react-pdf/renderer |
| Charts | recharts |
| Excel | xlsx |
| Calendar | bikram-sambat + date-fns |
| Notifications | CallMeBot WhatsApp API |

## Features

### Admin Dashboard
- 📊 **Dashboard** — Monthly collection charts, class-wise analytics, quick stats
- 👤 **Students** — CRUD, search/filter by class/section, Excel export
- 💰 **Fee Structure** — Per-class fee components, hostel fees, late fines
- 🧾 **Generate Bills** — Bulk invoice generation with BS month/year
- 💳 **Collect Payment** — Record payments, auto-update invoice status
- ⚠️ **Due Fees** — View all pending/overdue dues, send bulk reminders
- 🏠 **Hostel Fees** — Track hostel resident billing separately
- 🔔 **Notifications** — WhatsApp reminders via CallMeBot
- 📈 **Reports** — Monthly/class-wise/due-list reports with Excel export
- ⚙️ **Settings** — School info, WhatsApp API key, security config

### Parent Portal
- 📱 OTP-based login (no password needed)
- View all children's fee invoices
- Download invoice PDFs
- Payment history
- Enable WhatsApp notifications

### PWA Features
- ✅ Installable on Android/iOS
- ✅ Offline support (Workbox caching)
- ✅ App manifest with shortcuts

## Project Structure

```
school-billing/
├── app/
│   ├── api/                    # REST API routes
│   │   ├── auth/               # OTP send/verify/logout
│   │   ├── students/           # Student CRUD
│   │   ├── fees/               # Fee structure CRUD
│   │   ├── invoices/           # Invoice generation
│   │   ├── payments/           # Payment recording
│   │   ├── notifications/      # WhatsApp notifications
│   │   ├── reports/            # Analytics endpoints
│   │   └── parent/             # Parent portal API
│   ├── (auth)/login/           # Login page
│   ├── (dashboard)/            # Protected admin pages
│   │   ├── layout.tsx          # Sidebar layout
│   │   ├── dashboard/          # Main dashboard
│   │   ├── students/           # Student management
│   │   ├── fee-structure/      # Fee configuration
│   │   ├── generate-bills/     # Invoice generation
│   │   ├── collect-payment/    # Payment collection
│   │   ├── due-fees/           # Due fee tracking
│   │   ├── hostel-fees/        # Hostel billing
│   │   ├── notifications/      # WhatsApp alerts
│   │   ├── reports/            # Reports & analytics
│   │   └── settings/           # System settings
│   └── parent/                 # Parent portal
├── components/
│   ├── ui/                     # Button, Input, Badge, Modal
│   ├── forms/                  # FeeForm
│   ├── tables/                 # StudentTable
│   ├── charts/                 # recharts wrappers
│   └── pdf/                    # Invoice & Receipt PDF
├── lib/
│   ├── mongodb.ts              # DB connection
│   ├── auth.ts                 # jose JWT utils
│   ├── otp.ts                  # OTP generation
│   ├── callmebot.ts            # WhatsApp API
│   ├── nepali-date.ts          # BS/AD conversion
│   └── pdf.ts                  # PDF utilities
├── models/                     # Mongoose schemas
├── store/                      # Zustand stores
├── middleware.ts               # JWT auth protection
└── public/
    └── manifest.json           # PWA manifest
```

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) 1.0+ (used as package manager & runtime)
- MongoDB Atlas or local MongoDB

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Configure environment (already set with Atlas URI)
# Edit .env.local if needed

# 3. Seed initial admin user
bun run seed

# 4. Run development server
bun dev
```

### Common Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server (Next.js 16 + Turbopack) |
| `bun run build` | Production build |
| `bun start` | Start production server |
| `bun run seed` | Create initial admin user |
| `bun add <pkg>` | Add a package |

### Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/school-billing
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
CALLMEBOT_API_KEY=your-callmebot-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Default Admin Account

After seeding, login with:
- **Phone:** `+9779800000001`
- **OTP:** Shown in terminal (dev mode)

## WhatsApp Notifications Setup

1. Add `+34 644 59 57 90` to your contacts
2. Send: `I allow callmebot to send me messages`
3. You'll receive an API key on WhatsApp
4. Add it to `.env.local` as `CALLMEBOT_API_KEY`
5. Enable WhatsApp in parent profile settings

## Nepali Calendar Support

The system uses **Bikram Sambat (BS)** calendar:
- Invoices display both AD and BS dates
- Generate bills by BS month (Baisakh, Jestha, etc.)
- Payment receipts show BS date
- Academic year in BS format (e.g., 2081/2082)

## PDF Generation

- **Invoice PDF** — Full invoice with fee breakdown, BS/AD dates, amount in words
- **Receipt PDF** — Payment receipt with transaction details and school stamp

Both support download directly from the browser.

## Building for Production

```bash
npm run build
npm start
```

## PWA Installation

Visit the app in Chrome/Edge and click "Install" in the address bar, or use the browser menu → "Add to Home Screen" on mobile.
