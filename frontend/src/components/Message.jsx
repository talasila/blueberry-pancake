/**
 * Message component for displaying error/success/warning messages
 * @param {string} type - Message type: 'error', 'success', or 'warning'
 * @param {React.ReactNode} children - Message content
 * @param {string} className - Additional CSS classes
 */
export default function Message({ type, children, className = '' }) {
  const isError = type === 'error';
  const isWarning = type === 'warning';
  
  return (
    <div className={`text-sm p-3 rounded-md ${isError 
      ? 'text-destructive bg-destructive/10' 
      : isWarning
      ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
      : 'text-green-600 bg-green-50 dark:bg-green-900/20'
    } ${className}`}>
      {children}
    </div>
  );
}
