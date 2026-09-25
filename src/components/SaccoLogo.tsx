import logoIcon from '../assets/brand/logo-icon.webp'
import logoFull from '../assets/brand/logo-full.webp'

// Official Igembe Miraa Farmers SACCO logo.
//  variant="icon" (default) — emblem only, for the dashboard headers
//  variant="full"           — emblem + name + tagline, for the login page
//                             (keep it ≥ ~120px so the name stays readable)
// Keep in sync with igembe-dashboard/src/components/SaccoLogo.tsx.
export default function SaccoLogo({ size = 64, variant = 'icon' }: { size?: number; variant?: 'icon' | 'full' }) {
  return (
    <img
      src={variant === 'full' ? logoFull : logoIcon}
      alt="Igembe Miraa Farmers SACCO"
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size, flexShrink: 0, objectFit: 'contain' }}
    />
  )
}
