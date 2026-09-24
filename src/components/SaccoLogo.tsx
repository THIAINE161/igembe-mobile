// Branded Igembe SACCO logo — used on the login page and both dashboard
// headers. Keep in sync with igembe-dashboard/src/components/SaccoLogo.tsx.
export default function SaccoLogo() {
  return (
    <div style={{
      width: 64,
      height: 64,
      flexShrink: 0,
      background: 'linear-gradient(135deg, #15803d, #16a34a)',
      borderRadius: 16,
      border: '3px solid #FFD700',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <span style={{ fontSize: 14, lineHeight: 1 }}>🌿</span>
      <span style={{ color: 'white', fontWeight: 900, fontSize: 18, lineHeight: 1 }}>IG</span>
      <span style={{ color: '#FFD700', fontWeight: 700, fontSize: 7, lineHeight: 1.2, letterSpacing: 1 }}>SACCO</span>
    </div>
  )
}
