/** "มันจู" — our own round New Year chick mascot with a party hat. Pure SVG. */
export function Mascot({ size = 120, cheer = false, blink = false }: { size?: number; cheer?: boolean; blink?: boolean }) {
  const stroke = '#2B1D14';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="มันจู มาสคอตปีใหม่">
      <g stroke={stroke} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="60" cy="108" rx="30" ry="6" fill="#000" opacity=".18" stroke="none" />
        <path d="M18 66 Q6 52 14 44 Q26 50 28 62Z" fill="#F7B733" />
        <path d="M102 66 Q114 52 106 44 Q94 50 92 62Z" fill="#F7B733" />
        <ellipse cx="60" cy="70" rx="40" ry="36" fill="#FFD54A" />
        <ellipse cx="60" cy="82" rx="24" ry="18" fill="#FFF4DC" strokeWidth="0" />
        <path d="M30 40 L60 4 L90 40 Z" fill="#D9534F" />
        <path d="M44 24 L76 24" stroke="#FFF4DC" strokeWidth="5" />
        <circle cx="60" cy="6" r="7" fill="#6BCB3C" />
        <g className={blink ? 'mascot-blink' : undefined}>
          <circle cx="45" cy="64" r="6" fill={stroke} stroke="none" />
          <circle cx="75" cy="64" r="6" fill={stroke} stroke="none" />
          <circle cx="47" cy="62" r="2" fill="#fff" stroke="none" />
          <circle cx="77" cy="62" r="2" fill="#fff" stroke="none" />
        </g>
        <circle cx="33" cy="76" r="6" fill="#FF8FA3" stroke="none" opacity=".8" />
        <circle cx="87" cy="76" r="6" fill="#FF8FA3" stroke="none" opacity=".8" />
        {cheer ? (
          <path d="M50 76 Q60 92 70 76 Z" fill="#D9534F" />
        ) : (
          <path d="M52 76 L60 84 L68 76 Z" fill="#F4A25B" />
        )}
      </g>
    </svg>
  );
}
