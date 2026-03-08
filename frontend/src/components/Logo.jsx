/**
 * Logo Component
 * 
 * A simple logo featuring a filled circle with a white letter "b" inside.
 * The vertical stem of the "b" aligns with the vertical diameter of the circle.
 * 
 * @param {number} size - Size of the logo in pixels (default: 32)
 * @param {string} className - Additional CSS classes
 * @param {string} circleFill - Fill color for the circle (default: 'black')
 * @returns {JSX.Element} The logo SVG component
 */
function Logo({ size = 32, className = '', circleFill = 'black' }) {
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
      <circle
        cx="16"
        cy="16"
        r="15"
        style={{ fill: circleFill }}
        className="select-none"
      />
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
