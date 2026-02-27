/**
 * Message component for displaying error/success/warning messages
 * @param {string} type - Message type: 'error', 'success', or 'warning'
 * @param {React.ReactNode} children - Message content
 * @param {string} className - Additional CSS classes
 */
export default function Message({ type, children, className = '' }) {
  const styles = {
    error: 'text-destructive bg-destructive/10',
    warning: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    info: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    success: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  };
  const style = styles[type] || styles.success;
  
  return (
    <div className={`text-sm p-3 rounded-md ${style} ${className}`}>
      {children}
    </div>
  );
}
