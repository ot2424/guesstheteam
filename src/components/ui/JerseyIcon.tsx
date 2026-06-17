interface Props {
  size?: number;
  className?: string;
  /** Farbe des Trikots (Standard: aktuelle Textfarbe). */
  color?: string;
  /** Optionale Rückennummer auf dem Trikot. */
  number?: number | string;
  numberColor?: string;
}

/**
 * Trikot-/Jersey-Icon — App-Logo für GuessTheTeam.
 * Reines SVG, skaliert sauber, nimmt die übergebene Farbe an.
 */
export function JerseyIcon({ size = 24, className = '', color = 'currentColor', number, numberColor = 'rgba(0,0,0,0.32)' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* Trikot-Körper mit Ärmeln */}
      <path
        d="M19 5.5 L29 5.5 L42 12.6 L36.4 22.1 L32.5 19.8 L32.5 42.5 L15.5 42.5 L15.5 19.8 L11.6 22.1 L6 12.6 Z"
        fill={color}
        stroke="rgba(0,0,0,0.16)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Kragen */}
      <path
        d="M19 5.5 Q24 11.8 29 5.5"
        fill="none"
        stroke="rgba(0,0,0,0.24)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      {number != null && (
        <text
          x="24"
          y="36"
          textAnchor="middle"
          fontFamily="'Anton', sans-serif"
          fontSize="13"
          fill={numberColor}
        >
          {number}
        </text>
      )}
    </svg>
  );
}
