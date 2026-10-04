import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, options, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && <label className="text-[12px] font-medium text-text-muted mb-0.5">{label}</label>}
        <select
          ref={ref}
          className={`w-full bg-surface rounded-full h-11 px-4 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-ink/20 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-danger font-medium">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';
