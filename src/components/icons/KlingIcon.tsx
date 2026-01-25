export default function KlingIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="kling-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#4ade80', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#34d399', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* Outer ellipse */}
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="6"
        transform="rotate(-30 12 12)"
        fill="url(#kling-gradient)"
        opacity="0.9"
      />
      
      {/* Inner ellipse */}
      <ellipse
        cx="12"
        cy="12"
        rx="6"
        ry="4"
        transform="rotate(-30 12 12)"
        fill="none"
        stroke="url(#kling-gradient)"
        strokeWidth="1.5"
        opacity="0.7"
      />
    </svg>
  )
}
