"use client";

import { forwardRef, InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  wrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, wrapperClassName = "", className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className={`space-y-1 ${wrapperClassName}`}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">
            {label}
            {props.required && <span className="ml-1 text-red-400">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</div>
          )}
          <input
            ref={ref}
            id={inputId}
            suppressHydrationWarning
            className={`
              w-full rounded-lg border bg-slate-800/50 text-slate-100 placeholder-slate-500
              transition-colors duration-200 outline-none
              ${leftIcon ? "pl-10" : "pl-3"} ${rightIcon ? "pr-10" : "pr-3"} py-2.5 text-sm
              ${error
                ? "border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                : "border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              }
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</div>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
