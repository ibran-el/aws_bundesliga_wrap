import { useEffect, useState } from 'react';

/**
 * ErrorToast.jsx - Error Toast Component
 * 
 * Displays an error message with Retry and Dismiss buttons
 * Auto-dismisses after 5 seconds (optional)
 * 
 * @param {string} message - The error message to display
 * @param {function} onRetry - Callback when Retry button is clicked
 * @param {function} onDismiss - Callback when Dismiss button is clicked
 * @param {boolean} autoDismiss - Whether to auto-dismiss after 5 seconds (default: true)
 */
export default function ErrorToast({ message, onRetry, onDismiss, autoDismiss = true }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!autoDismiss) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [autoDismiss, onDismiss]);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm"
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-3">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleRetry}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          aria-label="Retry the failed operation"
        >
          Retry
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          aria-label="Dismiss the error message"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
