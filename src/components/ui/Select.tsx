import * as React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      containerClassName = '',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id ?? React.useId();
    const hasError = Boolean(error);

    const selectClasses = [
      'w-full bg-inputBg text-textPrimary border rounded-md',
      'transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
      'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'px-3 py-2.5 text-sm appearance-none',
      hasError
        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
        : 'border-border',
      className,
    ].join(' ');

    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-textMuted">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={selectClasses}
            aria-invalid={hasError}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-textMuted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </div>
        {error && <span className="text-xs font-medium text-red-400">{error}</span>}
        {helperText && !error && (
          <span className="text-xs text-[#52525B]">{helperText}</span>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
