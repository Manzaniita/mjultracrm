import * as React from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    'bg-[#161619] text-textMuted border border-border',
  success:
    'bg-[#00F5A0]/10 text-[#00F5A0] border border-[#00F5A0]/20',
  warning:
    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  danger:
    'bg-red-500/10 text-red-400 border border-red-500/20',
  info:
    'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  purple:
    'bg-[#7C3AED]/10 text-[#8B5CF6] border border-[#7C3AED]/20',
  outline:
    'bg-transparent text-textMuted border border-border',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', className = '', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={[
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          variantClasses[variant],
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';
