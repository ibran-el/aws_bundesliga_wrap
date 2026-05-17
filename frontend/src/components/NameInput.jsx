/**
 * NameInput.jsx - User Name Input Component
 * 
 * A controlled input component for entering the user's name.
 * Features:
 * - Controlled input with value and onChange props
 * - Max length: 50 characters
 * - Placeholder text
 * - Accessible with proper label association
 * - Focus ring styling for accessibility
 */

export function NameInput({ value, onChange }) {
  return (
    <div>
      <label htmlFor="name-input" className="block text-sm font-medium text-gray-700 mb-2">
        Your Name
      </label>
      <input
        id="name-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your name"
        maxLength={50}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
        aria-label="Your name"
      />
      <p className="text-xs text-gray-500 mt-1">{value.length}/50 characters</p>
    </div>
  )
}
