/**
 * LoadingSpinner component for displaying loading state
 * @param {string} size - Size: 'sm', 'md', or 'lg' (default: 'md')
 * @param {string} className - Additional CSS classes
 */
export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };
  
  return (
    <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]} ${className}`} />
  );
}
