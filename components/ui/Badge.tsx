import { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "pending" | "paid" | "overdue" | "partial";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  size?: "sm" | "md";
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-700 text-slate-300",
  success: "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30",
  warning: "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30",
  danger: "bg-red-500/20 text-red-400 ring-1 ring-red-500/30",
  info: "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30",
  pending: "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30",
  paid: "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30",
  overdue: "bg-red-500/20 text-red-400 ring-1 ring-red-500/30",
  partial: "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
  info: "bg-blue-400",
  pending: "bg-amber-400",
  paid: "bg-emerald-400",
  overdue: "bg-red-400",
  partial: "bg-blue-400",
};

export default function Badge({ variant = "default", children, size = "md", dot = false }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"}
        ${variantStyles[variant]}
      `}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

export function getStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    paid: "paid",
    pending: "pending",
    partial: "partial",
    overdue: "overdue",
    waived: "default",
    sent: "success",
    failed: "danger",
    active: "success",
    inactive: "danger",
  };
  return map[status] || "default";
}
