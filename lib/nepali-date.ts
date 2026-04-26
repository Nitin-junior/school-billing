import { format, parse } from "date-fns";

// BS months in Nepali
export const BS_MONTHS_NEPALI = [
  "बैशाख", "जेठ", "असार", "श्रावण", "भाद्र", "आश्विन",
  "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत्र",
];

export const BS_MONTHS_EN = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];

// Nepali digits
const NEPALI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function toNepaliDigits(num: number | string): string {
  return String(num)
    .split("")
    .map((d) => (isNaN(Number(d)) ? d : NEPALI_DIGITS[Number(d)]))
    .join("");
}

export function getCurrentBSYear(): number {
  const adYear = new Date().getFullYear();
  const adMonth = new Date().getMonth() + 1; // 1-12
  // BS year = AD year + 56 before mid-April, +57 from mid-April onwards
  return adMonth >= 4 ? adYear + 57 : adYear + 56;
}

export function getCurrentBSMonth(): number {
  const adMonth = new Date().getMonth() + 1;
  // Approximate mapping: Baisakh starts mid-April (AD month 4 ≈ BS month 1)
  const bsMonth = ((adMonth + 8) % 12) + 1;
  return bsMonth;
}

/**
 * Returns the currently active Nepali fiscal year string (e.g. "2082/83").
 * Nepal's fiscal year runs Shrawan 1 → Ashadh end (roughly mid-July → mid-July).
 * BS months 1–3 (Baisakh, Jestha, Ashadh) belong to the PREVIOUS fiscal year start.
 */
export function getCurrentFiscalYear(): string {
  const bsYear  = getCurrentBSYear();
  const bsMonth = getCurrentBSMonth();
  // Shrawan = month 4 in BS.  Before Shrawan we're still in last year's FY.
  const fyStart = bsMonth >= 4 ? bsYear : bsYear - 1;
  return `${fyStart}/${String(fyStart + 1).slice(-2)}`;
}

export function adToBs(adDate: Date): { year: number; month: number; day: number } {
  // Simplified BS/AD conversion table approach
  // For production use, rely on bikram-sambat package
  try {
    // Using basic approximation
    const year = adDate.getFullYear();
    const month = adDate.getMonth() + 1;
    const day = adDate.getDate();

    let bsYear = year + 56;
    let bsMonth = month + 8;
    let bsDay = day;

    if (bsMonth > 12) {
      bsMonth -= 12;
      bsYear += 1;
    }

    // Adjust for mid-month transition (approximate)
    if (day < 14) {
      bsMonth = bsMonth - 1;
      if (bsMonth === 0) {
        bsMonth = 12;
        bsYear -= 1;
      }
    }

    return { year: bsYear, month: bsMonth, day: bsDay };
  } catch {
    return { year: 2080, month: 1, day: 1 };
  }
}

export function formatBSDate(adDate: Date, nepaliDigits = false): string {
  const { year, month, day } = adToBs(adDate);
  const monthName = BS_MONTHS_EN[month - 1] || "Baisakh";
  const y = nepaliDigits ? toNepaliDigits(year) : year;
  const d = nepaliDigits ? toNepaliDigits(day) : day;
  return `${d} ${monthName} ${y}`;
}

export function formatBSDateShort(adDate: Date): string {
  const { year, month, day } = adToBs(adDate);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getBSMonthLabel(bsMonth: number): string {
  return BS_MONTHS_EN[bsMonth - 1] || "";
}

export function getAcademicYear(): string {
  const bsYear = getCurrentBSYear();
  return `${bsYear}/${bsYear + 1}`;
}

export function formatADDate(date: Date): string {
  return format(date, "dd MMM yyyy");
}

export function formatADDateTime(date: Date): string {
  return format(date, "dd MMM yyyy, hh:mm a");
}

export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}
