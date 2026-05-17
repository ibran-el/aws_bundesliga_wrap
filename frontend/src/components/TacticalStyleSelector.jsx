/**
 * TacticalStyleSelector.jsx - Tactical Style Selection Component
 * 
 * A dropdown component for selecting a tactical style preference.
 * Features:
 * - Dropdown with 3 tactical style options
 * - Controlled component with value and onChange props
 * - Accessible with proper label association
 * - Focus ring styling for accessibility
 */

const TACTICAL_STYLES = [
  'High Press',
  'Possession',
  'Counter-Attack',
]

export function TacticalStyleSelector({ value, onChange }) {
  return (
    <div>
      <label htmlFor="tactical-style-select" className="block text-sm font-medium text-gray-700 mb-2">
        Tactical Style
      </label>
      <select
        id="tactical-style-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors bg-white"
        aria-label="Tactical style preference"
      >
        {TACTICAL_STYLES.map((style) => (
          <option key={style} value={style}>
            {style}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 mt-1">Choose your preferred tactical approach</p>
    </div>
  )
}
