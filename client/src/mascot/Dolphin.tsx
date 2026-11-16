/** Party dolphin: our own original loading-screen mascot. Pure SVG. */
export function Dolphin({ size = 120 }: { size?: number }) {
  const stroke = '#2B1D14';
  const body = 'M22 92 C18 70 34 40 66 36 C86 33 100 42 104 54 L114 57 C119 61 115 67 108 66 C104 66 102 68 100 72 C92 94 62 104 40 100 C32 99 26 96 22 92 Z';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="โลมาปาร์ตี้">
      <defs>
        <clipPath id="dolphin-body"><path d={body} /></clipPath>
      </defs>
      <g stroke={stroke} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="62" cy="114" rx="34" ry="5" fill="#000" opacity=".18" stroke="none" />
        {/* tail flukes */}
        <path d="M24 90 C12 90 5 80 7 70 C16 72 23 78 28 86 Z" fill="#3FA7D6" />
        <path d="M24 92 C15 98 16 108 27 111 C27 104 30 99 33 96 Z" fill="#3FA7D6" />
        {/* dorsal fin */}
        <path d="M52 41 C53 25 63 17 73 19 C66 25 66 33 71 39 Z" fill="#3FA7D6" />
        {/* body + belly */}
        <path d={body} fill="#5BC0EB" />
        <g clipPath="url(#dolphin-body)" stroke="none">
          <ellipse cx="78" cy="98" rx="50" ry="22" fill="#FFF4DC" />
        </g>
        <path d={body} fill="none" />
        {/* pectoral fin */}
        <path d="M60 80 C55 91 59 100 70 102 C75 94 75 86 71 79 Z" fill="#3FA7D6" />
        {/* face */}
        <circle cx="88" cy="55" r="5.5" fill={stroke} stroke="none" />
        <circle cx="90" cy="53" r="2" fill="#fff" stroke="none" />
        <circle cx="94" cy="66" r="5" fill="#FF8FA3" stroke="none" opacity=".8" />
        <path d="M98 69 Q106 74 113 68" fill="none" strokeWidth="3" />
        {/* party hat */}
        <path d="M64 39 L92 40 L80 9 Z" fill="#D9534F" />
        <path d="M69 27 L85 28" stroke="#FFF4DC" strokeWidth="5" />
        <circle cx="80" cy="9" r="6.5" fill="#6BCB3C" />
        {/* splash */}
        <g fill="#BDE8F8" strokeWidth="3">
          <circle cx="102" cy="96" r="4" />
          <circle cx="112" cy="86" r="3" />
          <circle cx="12" cy="56" r="3" />
        </g>
      </g>
    </svg>
  );
}
