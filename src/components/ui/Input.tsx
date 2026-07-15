import * as React from 'react';

type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: InputSize;
  containerClassName?: string;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
};

const iconSizeClasses: Record<InputSize, string> = {
  sm: '[&>svg]:w-3.5 [&>svg]:h-3.5',
  md: '[&>svg]:w-4 [&>svg]:h-4',
  lg: '[&>svg]:w-5 [&>svg]:h-5',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      className = '',
      containerClassName = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? React.useId();

    const hasError = Boolean(error);

    const inputClasses = [
      'w-full bg-[#161619] text-[#F4F4F5] placeholder-[#52525B]',
      'border rounded-md',
      'transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
      'focus:outline-none',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      sizeClasses[inputSize],
      leftIcon ? 'pl-9' : '',
      rightIcon ? 'pr-9' : '',
      hasError
        ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]'
        : 'border-[#1F1F23] focus:border-[#7C3AED] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.15)]',
      className,
    ].join(' ');

    const iconClasses = [
      'absolute top-1/2 -translate-y-1/2 text-[#52525B] pointer-events-none',
      'flex items-center justify-center',
      iconSizeClasses[inputSize],
    ].join(' ');

    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#A1A1AA]"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className={`${iconClasses} left-3`}>{leftIcon}</span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {rightIcon && (
            <span className={`${iconClasses} right-3`}>{rightIcon}</span>
          )}
        </div>

        {error && (
          <span
            id={`${inputId}-error`}
            className="text-xs font-medium text-red-400"
          >
            {error}
          </span>
        )}

        {helperText && !error && (
          <span
            id={`${inputId}-helper`}
            className="text-xs text-[#52525B]"
          >
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
