import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && <label className="text-[12px] text-text-muted ml-1">{label}</label>}
        <input
          ref={ref}
          className={`w-full px-4 h-12 bg-surface text-text placeholder:text-text-muted rounded-full focus:outline-none focus:ring-2 focus:ring-ink/40 transition-shadow disabled:opacity-50 text-[14px] ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-danger font-medium ml-1">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
