interface MermaidIconProps {
  className?: string;
}

export function MermaidIcon({ className = "h-4 w-4" }: MermaidIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 7V17M7 9.5L12 12L17 9.5M7 14.5L12 17L17 14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="7"
        r="1.5"
        fill="currentColor"
      />
      <circle
        cx="7"
        cy="9.5"
        r="1"
        fill="currentColor"
      />
      <circle
        cx="17"
        cy="9.5"
        r="1"
        fill="currentColor"
      />
      <circle
        cx="7"
        cy="14.5"
        r="1"
        fill="currentColor"
      />
      <circle
        cx="17"
        cy="14.5"
        r="1"
        fill="currentColor"
      />
      <circle
        cx="12"
        cy="17"
        r="1.5"
        fill="currentColor"
      />
    </svg>
  );
}