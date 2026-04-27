import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/lib/suppress-hydration";
import HydrationSuppressor from "@/components/HydrationSuppressor";
import SessionSync from "@/components/SessionSync";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "School Billing & Fee Management",
  description: "Complete school fee management system with Nepali calendar support",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SchoolBilling" },
  icons: { apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#0f0f1a] text-slate-100 antialiased`} suppressHydrationWarning>
        <HydrationSuppressor />
        <SessionSync />
        {children}
      </body>
    </html>
  );
}
