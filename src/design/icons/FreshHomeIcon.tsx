
interface FreshIconProps {
  size?: number;
  className?: string;
}

export function FreshHomeIcon({
  size = 24,
  className,
}: FreshIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 11.5L12 4L20 11.5V20H14V15H10V20H4V11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="9"
        r="2"
        fill="currentColor"
      />
    </svg>
  );
}
