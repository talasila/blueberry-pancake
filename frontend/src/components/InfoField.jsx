/**
 * InfoField component for displaying labeled information
 * @param {string} label - Field label
 * @param {string|React.ReactNode} value - Field value
 * @param {string} className - Additional CSS classes for the value
 */
export default function InfoField({ label, value, className = '' }) {
  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <p className={`mt-1 ${className}`}>{value}</p>
    </div>
  );
}
