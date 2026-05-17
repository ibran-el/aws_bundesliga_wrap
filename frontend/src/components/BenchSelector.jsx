/**
 * BenchSelector.jsx - Substitution Player Selection Component
 * 
 * Renders starting XI and bench players for selection.
 * Features:
 * - Displays match info: match day, opponent, result, formation
 * - Renders starting XI as a list with shirt numbers and positions
 * - Renders bench players as a separate list
 * - Allows clicking on players to select them (highlight selected)
 * - Calls onSelectStarter() or onSelectBench() prop when clicked
 * - "Analyze Substitution" button enabled only when both starter and bench are selected
 * - Responsive and accessible
 */

import { useState, useEffect } from 'react'

export function BenchSelector({
  match = {},
  startingXI = [],
  bench = [],
  selectedStarter = null,
  selectedBench = null,
  onSelectStarter = () => {},
  onSelectBench = () => {},
  onAnalyzeSubstitution = () => {},
  loading = false,
}) {
  const [localSelectedStarter, setLocalSelectedStarter] = useState(selectedStarter)
  const [localSelectedBench, setLocalSelectedBench] = useState(selectedBench)

  /**
   * Update local state when props change
   */
  useEffect(() => {
    setLocalSelectedStarter(selectedStarter)
  }, [selectedStarter])

  useEffect(() => {
    setLocalSelectedBench(selectedBench)
  }, [selectedBench])

  /**
   * Handle starter player click
   */
  const handleStarterClick = (player) => {
    setLocalSelectedStarter(player)
    onSelectStarter(player)
  }

  /**
   * Handle bench player click
   */
  const handleBenchClick = (player) => {
    setLocalSelectedBench(player)
    onSelectBench(player)
  }

  /**
   * Check if both starter and bench are selected
   */
  const isBothSelected = localSelectedStarter && localSelectedBench

  /**
   * Render a player card
   */
  const PlayerCard = ({ player, isSelected, onClick, isStarter = false }) => {
    return (
      <button
        onClick={onClick}
        className={`
          w-full p-4 rounded-lg border-2 transition-all text-left
          ${isSelected
            ? 'border-blue-600 bg-blue-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
          }
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-pressed={isSelected}
        aria-label={`${isStarter ? 'Starting' : 'Bench'} player: ${player.name}, shirt number ${player.shirt_number}, position ${player.playing_position}`}
      >
        <div className="flex items-center gap-3">
          {/* Shirt number badge */}
          <div className="flex-shrink-0 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
            {player.shirt_number}
          </div>

          {/* Player info */}
          <div className="flex-grow min-w-0">
            <p className="font-semibold text-gray-900 truncate">{player.name}</p>
            <p className="text-sm text-gray-600">{player.playing_position}</p>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Match Info Section */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Match Information</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Match Day */}
          <div>
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Match Day</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{match.match_day || 'N/A'}</p>
          </div>

          {/* Opponent */}
          <div>
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Opponent</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{match.opponent || 'N/A'}</p>
          </div>

          {/* Result */}
          <div>
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Result</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{match.result || 'TBD'}</p>
          </div>

          {/* Formation */}
          <div>
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Formation</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{match.formation || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Starting XI Section */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Starting XI</h3>
        <p className="text-sm text-gray-600 mb-4">Click a player to remove them from the field</p>
        
        {startingXI && startingXI.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {startingXI.map((player) => (
              <PlayerCard
                key={player.person_id}
                player={player}
                isSelected={localSelectedStarter?.person_id === player.person_id}
                onClick={() => handleStarterClick(player)}
                isStarter={true}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-600">No starting XI data available</p>
          </div>
        )}
      </div>

      {/* Bench Section */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Bench Players</h3>
        <p className="text-sm text-gray-600 mb-4">Click a player to bring them on</p>
        
        {bench && bench.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bench.map((player) => (
              <PlayerCard
                key={player.person_id}
                player={player}
                isSelected={localSelectedBench?.person_id === player.person_id}
                onClick={() => handleBenchClick(player)}
                isStarter={false}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-600">No bench players available</p>
          </div>
        )}
      </div>

      {/* Selection Summary */}
      {(localSelectedStarter || localSelectedBench) && (
        <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-gray-900 mb-2">Selected Substitution:</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              {localSelectedStarter && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Out:</span> {localSelectedStarter.name} ({localSelectedStarter.playing_position})
                </p>
              )}
              {localSelectedBench && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">In:</span> {localSelectedBench.name} ({localSelectedBench.playing_position})
                </p>
              )}
            </div>
            {!isBothSelected && (
              <p className="text-xs text-gray-600">
                {!localSelectedStarter && !localSelectedBench && 'Select a starter and bench player'}
                {localSelectedStarter && !localSelectedBench && 'Select a bench player'}
                {!localSelectedStarter && localSelectedBench && 'Select a starter'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Analyze Button */}
      <div className="flex gap-3">
        <button
          onClick={onAnalyzeSubstitution}
          disabled={!isBothSelected || loading}
          className={`
            flex-1 px-6 py-3 rounded-lg font-semibold transition-all
            ${isBothSelected && !loading
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:focus:ring-0
          `}
          aria-label="Analyze the proposed substitution"
        >
          {loading ? 'Analyzing...' : 'Analyze Substitution'}
        </button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        Select one player from Starting XI and one from Bench to analyze the substitution
      </p>
    </div>
  )
}
