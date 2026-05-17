import { useEffect, useState } from 'react';

/**
 * Toast Component
 * Displays a temporary notification message that auto-dismisses after 3 seconds
 * 
 * @param {string} message - The message to display
 * @param {string} type - The type of toast: 'success', 'error', 'info' (default: 'info')
 * @param {function} onDismiss - Callback when toast is dismissed
 */
export default function Toast({ message, type = 'info', onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) {
    return null;
  }

  // Determine styling based on type
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type] || 'bg-blue-500';

  return (
    <div
      className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
