import * as React from 'react';
import { Loader } from './Loader';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-[#8B5CF6] to-[#7C3AED] text-white border border-[#7C3AED]/40 ' +
    'hover:from-[#9061F9] hover:to-[#7C3AED] hover:scale-[1.02] ' +
    'hover:shadow-[0_0_0_1px_rgba(124,58,237,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] ' +
    'active:scale-[0.98]',
  secondary:
    'bg-[#161619] text-[#F4F4F5] border border-[#1F1F23] ' +
    'hover:border-[#7C3AED]/50 hover:bg-[#1A1A1E] hover:text-white',
  ghost:
    'bg-transparent text-[#A1A1AA] border border-transparent ' +
    'hover:text-[#F4F4F5] hover:bg-[#161619]',
  danger:
    'bg-gradient-to-b from-[#EF4444] to-[#DC2626] text-white border border-[#DC2626]/40 ' +
    'hover:from-[#F87171] hover:to-[#EF4444] hover:scale-[1.02] ' +
    'hover:shadow-[0_0_0_1px_rgba(239,68,68,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] ' +
    'active:scale-[0.98]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    const classes = [
      'inline-flex items-center justify-center font-medium',
      'transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
      'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:ring-offset-2 focus:ring-offset-[#0B0B0C]',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
      variantClasses[variant],
      sizeClasses[size],
      className,
    ].join(' ');

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={classes}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader size="sm" color={variant === 'secondary' || variant === 'ghost' ? 'violet' : 'white'} />
            {children}
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
