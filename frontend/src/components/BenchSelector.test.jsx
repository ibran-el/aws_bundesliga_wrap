/**
 * BenchSelector.test.jsx - Unit and Integration Tests
 * 
 * Tests for the BenchSelector component covering:
 * - Match info rendering
 * - Starting XI rendering
 * - Bench players rendering
 * - Player selection (starter and bench)
 * - Button enable/disable logic
 * - Callback functions
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BenchSelector } from './BenchSelector'

/**
 * Mock data for testing
 */
const mockMatch = {
  match_id: 'match-123',
  match_day: '15',
  opponent: 'Borussia Dortmund',
  result: '2-1',
  formation: '4-2-3-1',
}

const mockStartingXI = [
  {
    person_id: 'player-1',
    name: 'Manuel Neuer',
    shirt_number: 1,
    playing_position: 'Goalkeeper',
  },
  {
    person_id: 'player-2',
    name: 'Dayot Upamecano',
    shirt_number: 2,
    playing_position: 'Defender',
  },
  {
    person_id: 'player-3',
    name: 'Serge Gnabry',
    shirt_number: 7,
    playing_position: 'Forward',
  },
]

const mockBench = [
  {
    person_id: 'player-4',
    name: 'Sven Ulreich',
    shirt_number: 26,
    playing_position: 'Goalkeeper',
  },
  {
    person_id: 'player-5',
    name: 'Alphonso Davies',
    shirt_number: 19,
    playing_position: 'Defender',
  },
  {
    person_id: 'player-6',
    name: 'Leroy Sané',
    shirt_number: 10,
    playing_position: 'Forward',
  },
]

describe('BenchSelector Component', () => {
  /**
   * Test: Match info rendering
   */
  it('should render match information correctly', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
      />
    )

    expect(screen.getByText('Match Information')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('Borussia Dortmund')).toBeInTheDocument()
    expect(screen.getByText('2-1')).toBeInTheDocument()
    expect(screen.getByText('4-2-3-1')).toBeInTheDocument()
  })

  /**
   * Test: Starting XI rendering
   */
  it('should render all starting XI players', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
      />
    )

    expect(screen.getByText('Starting XI')).toBeInTheDocument()
    expect(screen.getByText('Manuel Neuer')).toBeInTheDocument()
    expect(screen.getByText('Dayot Upamecano')).toBeInTheDocument()
    expect(screen.getByText('Serge Gnabry')).toBeInTheDocument()
  })

  /**
   * Test: Bench players rendering
   */
  it('should render all bench players', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
      />
    )

    expect(screen.getByText('Bench Players')).toBeInTheDocument()
    expect(screen.getByText('Sven Ulreich')).toBeInTheDocument()
    expect(screen.getByText('Alphonso Davies')).toBeInTheDocument()
    expect(screen.getByText('Leroy Sané')).toBeInTheDocument()
  })

  /**
   * Test: Shirt numbers rendering
   */
  it('should render shirt numbers for all players', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
      />
    )

    expect(screen.getByText('1')).toBeInTheDocument() // Neuer
    expect(screen.getByText('2')).toBeInTheDocument() // Upamecano
    expect(screen.getByText('7')).toBeInTheDocument() // Gnabry
    expect(screen.getByText('26')).toBeInTheDocument() // Ulreich
    expect(screen.getByText('19')).toBeInTheDocument() // Davies
    expect(screen.getByText('10')).toBeInTheDocument() // Sané
  })

  /**
   * Test: Player positions rendering
   */
  it('should render player positions', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
      />
    )

    expect(screen.getAllByText('Goalkeeper')).toHaveLength(2)
    expect(screen.getAllByText('Defender')).toHaveLength(2)
    expect(screen.getAllByText('Forward')).toHaveLength(2)
  })

  /**
   * Test: Starter selection
   */
  it('should call onSelectStarter when a starting player is clicked', async () => {
    const onSelectStarter = vi.fn()
    const user = userEvent.setup()

    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        onSelectStarter={onSelectStarter}
      />
    )

    const gnabrButton = screen.getByRole('button', {
      name: /Starting player: Serge Gnabry/i,
    })
    await user.click(gnabrButton)

    expect(onSelectStarter).toHaveBeenCalledWith(mockStartingXI[2])
  })

  /**
   * Test: Bench selection
   */
  it('should call onSelectBench when a bench player is clicked', async () => {
    const onSelectBench = vi.fn()
    const user = userEvent.setup()

    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        onSelectBench={onSelectBench}
      />
    )

    const saneButton = screen.getByRole('button', {
      name: /Bench player: Leroy Sané/i,
    })
    await user.click(saneButton)

    expect(onSelectBench).toHaveBeenCalledWith(mockBench[2])
  })

  /**
   * Test: Starter highlighting
   */
  it('should highlight selected starter', async () => {
    const user = userEvent.setup()

    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        selectedStarter={mockStartingXI[2]}
      />
    )

    const gnabrButton = screen.getByRole('button', {
      name: /Starting player: Serge Gnabry/i,
    })

    expect(gnabrButton).toHaveClass('border-blue-600', 'bg-blue-50')
  })

  /**
   * Test: Bench highlighting
   */
  it('should highlight selected bench player', async () => {
    const user = userEvent.setup()

    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        selectedBench={mockBench[2]}
      />
    )

    const saneButton = screen.getByRole('button', {
      name: /Bench player: Leroy Sané/i,
    })

    expect(saneButton).toHaveClass('border-blue-600', 'bg-blue-50')
  })

  /**
   * Test: Button disabled when no selection
   */
  it('should disable Analyze button when no players are selected', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
      />
    )

    const analyzeButton = screen.getByRole('button', {
      name: /Analyze the proposed substitution/i,
    })

    expect(analyzeButton).toBeDisabled()
  })

  /**
   * Test: Button disabled when only starter selected
   */
  it('should disable Analyze button when only starter is selected', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        selectedStarter={mockStartingXI[2]}
      />
    )

    const analyzeButton = screen.getByRole('button', {
      name: /Analyze the proposed substitution/i,
    })

    expect(analyzeButton).toBeDisabled()
  })

  /**
   * Test: Button disabled when only bench selected
   */
  it('should disable Analyze button when only bench player is selected', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        selectedBench={mockBench[2]}
      />
    )

    const analyzeButton = screen.getByRole('button', {
      name: /Analyze the proposed substitution/i,
    })

    expect(analyzeButton).toBeDisabled()
  })

  /**
   * Test: Button enabled when both selected
   */
  it('should enable Analyze button when both starter and bench are selected', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        selectedStarter={mockStartingXI[2]}
        selectedBench={mockBench[2]}
      />
    )

    const analyzeButton = screen.getByRole('button', {
      name: /Analyze the proposed substitution/i,
    })

    expect(analyzeButton).not.toBeDisabled()
  })

  /**
   * Test: Analyze button callback
   */
  it('should call onAnalyzeSubstitution when button is clicked with both selections', async () => {
    const onAnalyzeSubstitution = vi.fn()
    const user = userEvent.setup()

    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        selectedStarter={mockStartingXI[2]}
        selectedBench={mockBench[2]}
        onAnalyzeSubstitution={onAnalyzeSubstitution}
      />
    )

    const analyzeButton = screen.getByRole('button', {
      name: /Analyze the proposed substitution/i,
    })

    await user.click(analyzeButton)

    expect(onAnalyzeSubstitution).toHaveBeenCalled()
  })

  /**
   * Test: Selection summary display
   */
  it('should display selection summary when players are selected', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        selectedStarter={mockStartingXI[2]}
        selectedBench={mockBench[2]}
      />
    )

    expect(screen.getByText('Selected Substitution:')).toBeInTheDocument()
    expect(screen.getByText('Serge Gnabry')).toBeInTheDocument()
    expect(screen.getByText('Leroy Sané')).toBeInTheDocument()
  })

  /**
   * Test: Empty starting XI
   */
  it('should show message when starting XI is empty', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={[]}
        bench={mockBench}
      />
    )

    expect(screen.getByText('No starting XI data available')).toBeInTheDocument()
  })

  /**
   * Test: Empty bench
   */
  it('should show message when bench is empty', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={[]}
      />
    )

    expect(screen.getByText('No bench players available')).toBeInTheDocument()
  })

  /**
   * Test: Loading state
   */
  it('should disable button and show loading text when loading', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        selectedStarter={mockStartingXI[2]}
        selectedBench={mockBench[2]}
        loading={true}
      />
    )

    const analyzeButton = screen.getByRole('button', {
      name: /Analyze the proposed substitution/i,
    })

    expect(analyzeButton).toBeDisabled()
    expect(analyzeButton).toHaveTextContent('Analyzing...')
  })

  /**
   * Test: Accessibility - keyboard navigation
   */
  it('should be keyboard navigable', async () => {
    const onSelectStarter = vi.fn()
    const user = userEvent.setup()

    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        onSelectStarter={onSelectStarter}
      />
    )

    const gnabrButton = screen.getByRole('button', {
      name: /Starting player: Serge Gnabry/i,
    })

    // Tab to button and press Enter
    gnabrButton.focus()
    await user.keyboard('{Enter}')

    // Callback should be called
    expect(onSelectStarter).toHaveBeenCalled()
  })

  /**
   * Test: Accessibility - aria labels
   */
  it('should have proper aria labels for accessibility', () => {
    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
      />
    )

    const gnabrButton = screen.getByRole('button', {
      name: /Starting player: Serge Gnabry, shirt number 7, position Forward/i,
    })

    expect(gnabrButton).toBeInTheDocument()
  })

  /**
   * Test: Responsive grid layout
   */
  it('should render players in a responsive grid', () => {
    const { container } = render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
      />
    )

    const grids = container.querySelectorAll('.grid')
    expect(grids.length).toBeGreaterThan(0)
  })

  /**
   * Test: Multiple selections and deselections
   */
  it('should handle multiple player selections', async () => {
    const onSelectStarter = vi.fn()
    const user = userEvent.setup()

    render(
      <BenchSelector
        match={mockMatch}
        startingXI={mockStartingXI}
        bench={mockBench}
        onSelectStarter={onSelectStarter}
      />
    )

    // Click first player
    const neuerButton = screen.getByRole('button', {
      name: /Starting player: Manuel Neuer/i,
    })
    await user.click(neuerButton)
    expect(onSelectStarter).toHaveBeenCalledWith(mockStartingXI[0])

    // Click second player
    const gnabrButton = screen.getByRole('button', {
      name: /Starting player: Serge Gnabry/i,
    })
    await user.click(gnabrButton)
    expect(onSelectStarter).toHaveBeenCalledWith(mockStartingXI[2])
  })

  /**
   * Test: Match info with missing data
   */
  it('should handle missing match data gracefully', () => {
    render(
      <BenchSelector
        match={{}}
        startingXI={mockStartingXI}
        bench={mockBench}
      />
    )

    expect(screen.getAllByText('N/A')).toHaveLength(3) // match_day, opponent, formation
    expect(screen.getByText('TBD')).toBeInTheDocument() // result
  })

  /**
   * Test: Player with special characters in name
   */
  it('should render players with special characters in names', () => {
    const specialCharPlayers = [
      {
        person_id: 'player-special',
        name: 'Müller-Schäfer',
        shirt_number: 9,
        playing_position: 'Forward',
      },
    ]

    render(
      <BenchSelector
        match={mockMatch}
        startingXI={specialCharPlayers}
        bench={mockBench}
      />
    )

    expect(screen.getByText('Müller-Schäfer')).toBeInTheDocument()
  })
})
