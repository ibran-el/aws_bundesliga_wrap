/**
 * ClubSelector.jsx - Club Selection Component
 * 
 * Renders 18 Bundesliga clubs as clickable cards with hex colors.
 * Features:
 * - Fetches clubs from API on mount
 * - Displays clubs sorted alphabetically
 * - Each card shows club name with primary_color background and secondary_color text
 * - Calls onSelectClub(club) prop when a club is clicked
 * - Shows loading spinner while fetching
 * - Shows error message with retry button on failure
 * - Responsive grid: 1 col (mobile), 2 cols (tablet), 3+ cols (desktop)
 */

import { useState, useEffect } from 'react'
import { fetchClubs } from '../api'
import { Spinner } from './Spinner'

export function ClubSelector({ onSelectClub }) {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedClubId, setSelectedClubId] = useState(null)

  /**
   * Fetch clubs from API
   */
  const loadClubs = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchClubs()
      // Sort clubs alphabetically by name
      const sortedClubs = data.clubs.sort((a, b) => a.name.localeCompare(b.name))
      setClubs(sortedClubs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load clubs on component mount
   */
  useEffect(() => {
    loadClubs()
  }, [])

  /**
   * Handle club card click
   */
  const handleClubClick = (club) => {
    setSelectedClubId(club.club_id)
    onSelectClub(club)
  }

  /**
   * Render loading state
   */
  if (loading) {
    return <Spinner message="Loading clubs..." />
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Clubs</h3>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <button
            onClick={loadClubs}
            className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  /**
   * Render clubs grid
   */
  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Select Your Club</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubs.map((club) => (
          <button
            key={club.club_id}
            onClick={() => handleClubClick(club)}
            className={`p-6 rounded-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              selectedClubId === club.club_id ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : 'shadow'
            }`}
            style={{
              backgroundColor: club.primary_color,
              color: club.secondary_color,
            }}
            title={`${club.name} (${club.three_letter_code})`}
          >
            <div className="text-center">
              <h3 className="text-lg font-bold mb-1">{club.name}</h3>
              <p className="text-sm opacity-90">{club.short_name}</p>
              <p className="text-xs opacity-75 mt-2">{club.three_letter_code}</p>
            </div>
          </button>
        ))}
      </div>

      {clubs.length === 0 && !loading && !error && (
        <div className="text-center py-12 text-gray-500">
          <p>No clubs available</p>
        </div>
      )}
    </div>
  )
}
