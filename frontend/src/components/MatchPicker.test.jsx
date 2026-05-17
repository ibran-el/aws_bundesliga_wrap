/**
 * MatchPicker.test.jsx - Unit Tests for MatchPicker Component
 * 
 * Tests:
 * - Renders dropdown with correct number of matches
 * - Sorts matches by match_day ascending
 * - Formats match text correctly
 * - Calls onSelectMatch callback when a match is selected
 * - Handles empty matches array
 * - Handles loading state
 * - Accessibility: label associated with select, aria-label present
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MatchPicker } from './MatchPicker'

describe('MatchPicker Component', () => {
  // Mock match data
  const mockMatches = [
    {
      match_id: 'match-1',
      match_day: 5,
      home_team: 'Bayern Munich',
      away_team: 'Borussia Dortmund',
      result: '2-1',
    },
    {
      match_id: 'match-2',
      match_day: 3,
      home_team: 'RB Leipzig',
      away_team: 'Bayer Leverkusen',
      result: '1-1',
    },
    {
      match_id: 'match-3',
      match_day: 1,
      home_team: 'Eintracht Frankfurt',
      away_team: 'VfB Stuttgart',
      result: '0-2',
    },
  ]

  it('renders dropdown with label', () => {
    const mockCallback = vi.fn()
    render(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} />)
    
    expect(screen.getByLabelText('Select a Match')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders all matches as options', () => {
    const mockCallback = vi.fn()
    render(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} />)
    
    // Should have 3 matches + 1 placeholder option
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(4)
  })

  it('sorts matches by match_day ascending', () => {
    const mockCallback = vi.fn()
    render(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} />)
    
    const options = screen.getAllByRole('option')
    // Skip the first placeholder option
    expect(options[1]).toHaveTextContent('Match Day 1')
    expect(options[2]).toHaveTextContent('Match Day 3')
    expect(options[3]).toHaveTextContent('Match Day 5')
  })

  it('formats match text correctly', () => {
    const mockCallback = vi.fn()
    render(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} />)
    
    expect(screen.getByText('Match Day 1: Eintracht Frankfurt vs VfB Stuttgart (0-2)')).toBeInTheDocument()
    expect(screen.getByText('Match Day 3: RB Leipzig vs Bayer Leverkusen (1-1)')).toBeInTheDocument()
    expect(screen.getByText('Match Day 5: Bayern Munich vs Borussia Dortmund (2-1)')).toBeInTheDocument()
  })

  it('calls onSelectMatch callback when a match is selected', () => {
    const mockCallback = vi.fn()
    render(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} />)
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'match-2' } })
    
    expect(mockCallback).toHaveBeenCalledWith(mockMatches[1])
  })

  it('displays placeholder option initially', () => {
    const mockCallback = vi.fn()
    render(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} />)
    
    const select = screen.getByRole('combobox')
    expect(select.value).toBe('')
    expect(screen.getByText('-- Select a match --')).toBeInTheDocument()
  })

  it('handles empty matches array', () => {
    const mockCallback = vi.fn()
    render(<MatchPicker matches={[]} onSelectMatch={mockCallback} />)
    
    expect(screen.getByText('No matches available for this season.')).toBeInTheDocument()
  })

  it('handles undefined matches prop', () => {
    const mockCallback = vi.fn()
    render(<MatchPicker onSelectMatch={mockCallback} />)
    
    expect(screen.getByText('No matches available for this season.')).toBeInTheDocument()
  })

  it('displays loading state', () => {
    const mockCallback = vi.fn()
    render(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} loading={true} />)
    
    expect(screen.getByText('Loading matches...')).toBeInTheDocument()
  })

  it('displays match count helper text', () => {
    const mockCallback = vi.fn()
    render(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} />)
    
    expect(screen.getByText('3 matches available')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    const mockCallback = vi.fn()
    render(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} />)
    
    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('id', 'match-picker')
    expect(select).toHaveAttribute('aria-label', 'Select a match from the 2024-25 season')
    
    // Verify label is associated with select via aria-labelledby or direct text
    const label = screen.getByText('Select a Match')
    expect(label).toBeInTheDocument()
  })

  it('handles matches with missing fields gracefully', () => {
    const mockCallback = vi.fn()
    const incompleteMatches = [
      {
        match_id: 'match-1',
        match_day: 1,
        home_team: 'Team A',
        // away_team missing
        // result missing
      },
    ]
    
    render(<MatchPicker matches={incompleteMatches} onSelectMatch={mockCallback} />)
    
    expect(screen.getByText('Match Day 1: Team A vs Unknown (TBD)')).toBeInTheDocument()
  })

  it('updates sorted matches when matches prop changes', () => {
    const mockCallback = vi.fn()
    const { rerender } = render(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} />)
    
    expect(screen.getByText('3 matches available')).toBeInTheDocument()
    
    const newMatches = [
      ...mockMatches,
      {
        match_id: 'match-4',
        match_day: 2,
        home_team: 'Team X',
        away_team: 'Team Y',
        result: '1-0',
      },
    ]
    
    rerender(<MatchPicker matches={newMatches} onSelectMatch={mockCallback} />)
    
    expect(screen.getByText('4 matches available')).toBeInTheDocument()
  })

  it('maintains selection when matches are re-sorted', () => {
    const mockCallback = vi.fn()
    const { rerender } = render(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} />)
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'match-2' } })
    
    expect(mockCallback).toHaveBeenCalledWith(mockMatches[1])
    
    // Re-render with same matches
    rerender(<MatchPicker matches={mockMatches} onSelectMatch={mockCallback} />)
    
    // Selection should still be valid
    expect(select.value).toBe('match-2')
  })
})
