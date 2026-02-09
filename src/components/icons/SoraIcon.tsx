export default function SoraIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="sora-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#f97316', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#fb923c', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Film frame / viewport */}
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        fill="url(#sora-gradient)"
        opacity="0.9"
      />

      {/* Play triangle */}
      <path
        d="M10 9L16 12L10 15V9Z"
        fill="#1c2431"
        opacity="0.85"
      />
    </svg>
  )
}
