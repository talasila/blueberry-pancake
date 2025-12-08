/**
 * Logo Component
 * 
 * A simple logo featuring a black filled circle with a white letter "b" inside.
 * The vertical stem of the "b" aligns with the vertical diameter of the circle.
 * 
 * @param {number} size - Size of the logo in pixels (default: 32)
 * @param {string} className - Additional CSS classes
 * @returns {JSX.Element} The logo SVG component
 */
function Logo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Blind Tasting logo"
    >
      {/* Black filled circle */}
      <circle
        cx="16"
        cy="16"
        r="15"
        fill="black"
        className="select-none"
      />
      
      {/* White letter "b" - vertical stem aligned with vertical center */}
      <text
        x="10"
        y="26"
        fontSize="30"
        fontWeight="300"
        fontFamily="OpenSans-SemiBold"
        textAnchor="start"
        fill="white"
        letterSpacing="-0.3"
        className="select-none"
      >
        b
      </text>
    </svg>
  );
}

export default Logo;
