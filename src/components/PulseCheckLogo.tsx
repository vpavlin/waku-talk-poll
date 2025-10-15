/**
 * PulseCheck Logo Component
 * Heartbeat with Question Mark icon
 */

interface PulseCheckLogoProps {
  className?: string;
  size?: number;
}

export function PulseCheckLogo({ className = "", size = 32 }: PulseCheckLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Heartbeat line */}
      <path
        d="M3 12h3l2-4 2 8 2-4h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Question mark */}
      <path
        d="M17 8c0-1.5 1-2 2-2s2 0.5 2 2c0 1.5-1 2-2 3v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="19"
        cy="16"
        r="0.5"
        fill="currentColor"
      />
    </svg>
  );
}
