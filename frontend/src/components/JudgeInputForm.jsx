/**
 * JudgeInputForm.jsx - Judge Input Form Component
 * 
 * A form component that collects user input for generating a personalized Wrapped card.
 * Features:
 * - Displays selected club with its colors
 * - Text input for user's name (NameInput component)
 * - Dropdown for tactical style selection (TacticalStyleSelector component)
 * - "Generate Wrapped" button disabled until name is entered
 * - Calls onGenerateWrapped callback with (name, tacticalStyle) on submit
 */

import { NameInput } from './NameInput'
import { TacticalStyleSelector } from './TacticalStyleSelector'

export function JudgeInputForm({
  selectedClub,
  userName,
  onUserNameChange,
  tacticalStyle,
  onTacticalStyleChange,
  onGenerateWrapped,
  loading = false,
  onChangeClub,
}) {
  // Button is disabled if no name entered or no club selected or loading
  const isButtonDisabled = !userName.trim() || !selectedClub || loading

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isButtonDisabled) {
      onGenerateWrapped(userName, tacticalStyle)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Wrapped</h1>
        <p className="text-gray-600">Enter your details to generate a personalized season recap</p>
      </div>

      {/* Club Display Section */}
      {selectedClub ? (
        <div
          className="mb-8 p-6 rounded-lg shadow-md transition-all"
          style={{ backgroundColor: selectedClub.primary_color }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm font-medium opacity-90"
                style={{ color: selectedClub.secondary_color }}
              >
                Selected Club
              </p>
              <h2
                className="text-2xl font-bold"
                style={{ color: selectedClub.secondary_color }}
              >
                {selectedClub.name}
              </h2>
              <p
                className="text-xs mt-1 opacity-75"
                style={{ color: selectedClub.secondary_color }}
              >
                {selectedClub.short_name} • {selectedClub.three_letter_code}
              </p>
            </div>
            <button
              onClick={onChangeClub}
              className="px-4 py-2 rounded font-medium transition-colors"
              style={{
                backgroundColor: selectedClub.secondary_color,
                color: selectedClub.primary_color,
              }}
              aria-label="Change club selection"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300">
          <p className="text-gray-600 text-center">Please select a club first</p>
        </div>
      )}

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
        {/* Name Input */}
        <div>
          <NameInput value={userName} onChange={onUserNameChange} />
        </div>

        {/* Tactical Style Selector */}
        <div>
          <TacticalStyleSelector value={tacticalStyle} onChange={onTacticalStyleChange} />
        </div>

        {/* Generate Wrapped Button */}
        <button
          type="submit"
          disabled={isButtonDisabled}
          className={`w-full px-6 py-3 font-semibold rounded-lg transition-colors ${
            isButtonDisabled
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
          aria-label="Generate wrapped card"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Generating...
            </span>
          ) : (
            'Generate My Wrapped'
          )}
        </button>

        {/* Helper text */}
        <p className="text-xs text-gray-500 text-center">
          {!userName.trim() && selectedClub
            ? 'Enter your name to continue'
            : !selectedClub
            ? 'Select a club to continue'
            : 'Ready to generate your personalized Wrapped card'}
        </p>
      </form>
    </div>
  )
}
