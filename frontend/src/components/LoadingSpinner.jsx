/**
 * LoadingSpinner.jsx - Reusable Loading Spinner Component
 * 
 * Displays a centered spinning loader with optional message
 * Includes accessibility attributes for screen readers
 */

export function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-12"
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  )
}
