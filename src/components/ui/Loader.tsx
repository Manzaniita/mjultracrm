type LoaderSize = 'sm' | 'md' | 'lg';
type LoaderColor = 'violet' | 'green' | 'white';

export interface LoaderProps {
  size?: LoaderSize;
  color?: LoaderColor;
  className?: string;
  label?: string;
}

const sizeClasses: Record<LoaderSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

const colorClasses: Record<LoaderColor, string> = {
  violet: 'text-[#7C3AED]',
  green: 'text-[#00F5A0]',
  white: 'text-[#F4F4F5]',
};

export function Loader({
  size = 'md',
  color = 'violet',
  className = '',
  label = 'Cargando...',
}: LoaderProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={[
        'inline-flex items-center justify-center',
        sizeClasses[size],
        colorClasses[color],
        className,
      ].join(' ')}
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full origin-center animate-[spin_3s_linear_infinite]"
      >
        <defs>
          <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Anillo exterior */}
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="80 180"
          className="origin-center animate-[spin_2s_linear_infinite]"
          style={{ opacity: 0.9 }}
        />

        {/* Anillo medio */}
        <circle
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke="url(#loaderGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="60 130"
          className="origin-center animate-[spin_1.5s_linear_infinite_reverse]"
          style={{ opacity: 0.7 }}
        />

        {/* Anillo interior */}
        <circle
          cx="50"
          cy="50"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="40 80"
          className="origin-center animate-[spin_1s_linear_infinite]"
          style={{ opacity: 0.5 }}
        />

        {/* Núcleo pulsante */}
        <circle
          cx="50"
          cy="50"
          r="6"
          fill="currentColor"
          className="origin-center animate-[pulse_1.2s_ease-in-out_infinite]"
        />
      </svg>
    </span>
  );
}
