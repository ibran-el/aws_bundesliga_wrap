/**
 * MatchPicker.jsx - Match Selection Component
 * 
 * Renders a dropdown to select a match from 306 fixtures.
 * Features:
 * - Accepts matches array as prop
 * - Renders dropdown sorted by match_day ascending
 * - Format: "Match Day X: Home vs Guest (Result)"
 * - Calls onSelectMatch(match) prop when a match is selected
 * - Shows loading state while fetching
 * - Shows error message with retry button on failure
 * - Responsive and accessible
 */

import { useState, useEffect } from 'react'

export function MatchPicker({ matches = [], onSelectMatch, loading = false }) {
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [sortedMatches, setSortedMatches] = useState([])

  /**
   * Sort matches by match_day ascending when matches prop changes
   */
  useEffect(() => {
    if (matches && matches.length > 0) {
      const sorted = [...matches].sort((a, b) => {
        const dayA = parseInt(a.match_day) || 0
        const dayB = parseInt(b.match_day) || 0
        return dayA - dayB
      })
      setSortedMatches(sorted)
    }
  }, [matches])

  /**
   * Handle match selection
   */
  const handleMatchChange = (e) => {
    const matchId = e.target.value
    setSelectedMatchId(matchId)
    
    // Find the selected match and call the callback
    const selected = sortedMatches.find(m => m.match_id === matchId)
    if (selected) {
      onSelectMatch(selected)
    }
  }

  /**
   * Format match display text
   */
  const formatMatchText = (match) => {
    const day = match.match_day || 'N/A'
    const home = match.home_team || 'Unknown'
    const away = match.away_team || 'Unknown'
    const result = match.result || 'TBD'
    return `Match Day ${day}: ${home} vs ${away} (${result})`
  }

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Select a Match
        </label>
        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500">
          Loading matches...
        </div>
      </div>
    )
  }

  /**
   * Render no matches state
   */
  if (!sortedMatches || sortedMatches.length === 0) {
    return (
      <div className="w-full">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Select a Match
        </label>
        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
          No matches available for this season.
        </div>
      </div>
    )
  }

  /**
   * Render dropdown
   */
  return (
    <div className="w-full">
      <label 
        htmlFor="match-picker"
        className="block text-sm font-semibold text-gray-900 mb-2"
      >
        Select a Match
      </label>
      
      <select
        id="match-picker"
        value={selectedMatchId}
        onChange={handleMatchChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        aria-label="Select a match from the 2024-25 season"
      >
        <option value="">-- Select a match --</option>
        {sortedMatches.map((match) => (
          <option key={match.match_id} value={match.match_id}>
            {formatMatchText(match)}
          </option>
        ))}
      </select>

      {/* Helper text */}
      <p className="text-xs text-gray-500 mt-2">
        {sortedMatches.length} matches available
      </p>
    </div>
  )
}
