/**
 * ClubSelector.test.jsx - Unit and Integration Tests
 * 
 * Tests for ClubSelector component covering:
 * - API integration and data fetching
 * - Loading and error states
 * - Club rendering and sorting
 * - Club selection and callback
 * - Responsive grid layout
 * - Retry functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClubSelector } from './ClubSelector'
import * as api from '../api'

// Mock the API module
vi.mock('../api')

// Mock club data
const mockClubs = [
  {
    club_id: 'DFL-CLU-00000G',
    name: 'FC Bayern Munich',
    short_name: 'Bayern',
    three_letter_code: 'FCB',
    primary_color: '#DC052D',
    secondary_color: '#FFFFFF'
  },
  {
    club_id: 'DFL-CLU-00001H',
    name: 'Borussia Dortmund',
    short_name: 'Dortmund',
    three_letter_code: 'BVB',
    primary_color: '#FFD700',
    secondary_color: '#000000'
  },
  {
    club_id: 'DFL-CLU-00002I',
    name: 'Bayer Leverkusen',
    short_name: 'Leverkusen',
    three_letter_code: 'B04',
    primary_color: '#E4001B',
    secondary_color: '#FFFFFF'
  }
]

describe('ClubSelector Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading spinner on mount', () => {
      api.fetchClubs.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      expect(screen.getByText('Loading clubs...')).toBeInTheDocument()
    })

    it('should call fetchClubs on mount', async () => {
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        expect(api.fetchClubs).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Successful Data Loading', () => {
    it('should render all clubs after loading', async () => {
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('FC Bayern Munich')).toBeInTheDocument()
        expect(screen.getByText('Borussia Dortmund')).toBeInTheDocument()
        expect(screen.getByText('Bayer Leverkusen')).toBeInTheDocument()
      })
    })

    it('should render clubs sorted alphabetically', async () => {
      const unsortedClubs = [mockClubs[2], mockClubs[0], mockClubs[1]] // Out of order
      api.fetchClubs.mockResolvedValue({ clubs: unsortedClubs })
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        // Filter out retry button if present
        const clubButtons = buttons.filter(btn => btn.textContent.includes('short_name'))
        
        // Check that clubs appear in alphabetical order
        const clubNames = Array.from(screen.getAllByRole('button'))
          .filter(btn => btn.textContent.includes('Bayern') || btn.textContent.includes('Dortmund') || btn.textContent.includes('Leverkusen'))
          .map(btn => btn.textContent)
        
        expect(clubNames[0]).toContain('Bayer Leverkusen')
        expect(clubNames[1]).toContain('Borussia Dortmund')
        expect(clubNames[2]).toContain('FC Bayern Munich')
      })
    })

    it('should display club information correctly', async () => {
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Bayern')).toBeInTheDocument()
        expect(screen.getByText('FCB')).toBeInTheDocument()
        expect(screen.getByText('Dortmund')).toBeInTheDocument()
        expect(screen.getByText('BVB')).toBeInTheDocument()
      })
    })

    it('should apply hex colors to club cards', async () => {
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      const { container } = render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        const buttons = container.querySelectorAll('button')
        const bayernButton = Array.from(buttons).find(btn => btn.textContent.includes('Bayern'))
        
        // Check that inline styles are applied
        expect(bayernButton).toHaveAttribute('style')
        const style = bayernButton.getAttribute('style')
        expect(style).toContain('background-color')
        expect(style).toContain('color')
      })
    })
  })

  describe('Club Selection', () => {
    it('should call onSelectClub when a club is clicked', async () => {
      const onSelectClub = vi.fn()
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      render(<ClubSelector onSelectClub={onSelectClub} />)
      
      await waitFor(() => {
        expect(screen.getByText('FC Bayern Munich')).toBeInTheDocument()
      })
      
      const bayernButton = screen.getByText('FC Bayern Munich').closest('button')
      fireEvent.click(bayernButton)
      
      // Find the Bayern club in mockClubs
      const bayernClub = mockClubs.find(c => c.name === 'FC Bayern Munich')
      expect(onSelectClub).toHaveBeenCalledWith(bayernClub)
    })

    it('should highlight selected club', async () => {
      const onSelectClub = vi.fn()
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      const { container } = render(<ClubSelector onSelectClub={onSelectClub} />)
      
      await waitFor(() => {
        expect(screen.getByText('FC Bayern Munich')).toBeInTheDocument()
      })
      
      const bayernButton = screen.getByText('FC Bayern Munich').closest('button')
      fireEvent.click(bayernButton)
      
      await waitFor(() => {
        expect(bayernButton).toHaveClass('ring-2')
      })
    })

    it('should pass correct club data to callback', async () => {
      const onSelectClub = vi.fn()
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      render(<ClubSelector onSelectClub={onSelectClub} />)
      
      await waitFor(() => {
        expect(screen.getByText('Borussia Dortmund')).toBeInTheDocument()
      })
      
      const dortmundButton = screen.getByText('Borussia Dortmund').closest('button')
      fireEvent.click(dortmundButton)
      
      expect(onSelectClub).toHaveBeenCalledWith(mockClubs[1])
      expect(onSelectClub).toHaveBeenCalledWith(
        expect.objectContaining({
          club_id: 'DFL-CLU-00001H',
          name: 'Borussia Dortmund',
          three_letter_code: 'BVB'
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      const errorMessage = 'Failed to fetch clubs'
      api.fetchClubs.mockRejectedValue(new Error(errorMessage))
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to Load Clubs')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('should display retry button on error', async () => {
      api.fetchClubs.mockRejectedValue(new Error('Network error'))
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('should retry loading clubs when retry button is clicked', async () => {
      api.fetchClubs
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ clubs: mockClubs })
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
      
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByText('FC Bayern Munich')).toBeInTheDocument()
      })
      
      expect(api.fetchClubs).toHaveBeenCalledTimes(2)
    })

    it('should clear error message when retry succeeds', async () => {
      api.fetchClubs
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ clubs: mockClubs })
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to Load Clubs')).toBeInTheDocument()
      })
      
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Failed to Load Clubs')).not.toBeInTheDocument()
        expect(screen.getByText('FC Bayern Munich')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Grid Layout', () => {
    it('should render grid with responsive classes', async () => {
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      const { container } = render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        const grid = container.querySelector('.grid')
        expect(grid).toHaveClass('grid-cols-1')
        expect(grid).toHaveClass('md:grid-cols-2')
        expect(grid).toHaveClass('lg:grid-cols-3')
      })
    })

    it('should render correct number of club cards', async () => {
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        // Should have 3 club buttons (no retry button since no error)
        const clubButtons = buttons.filter(btn => 
          btn.textContent.includes('Bayern') || 
          btn.textContent.includes('Dortmund') || 
          btn.textContent.includes('Leverkusen')
        )
        expect(clubButtons).toHaveLength(3)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty clubs list', async () => {
      api.fetchClubs.mockResolvedValue({ clubs: [] })
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('No clubs available')).toBeInTheDocument()
      })
    })

    it('should handle clubs with special characters in names', async () => {
      const specialClubs = [
        {
          ...mockClubs[0],
          name: 'FC Köln',
          short_name: 'Köln'
        }
      ]
      api.fetchClubs.mockResolvedValue({ clubs: specialClubs })
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('FC Köln')).toBeInTheDocument()
      })
    })

    it('should handle clubs with very long names', async () => {
      const longNameClubs = [
        {
          ...mockClubs[0],
          name: 'Very Long Club Name That Should Still Fit'
        }
      ]
      api.fetchClubs.mockResolvedValue({ clubs: longNameClubs })
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Very Long Club Name That Should Still Fit')).toBeInTheDocument()
      })
    })

    it('should handle rapid successive club selections', async () => {
      const onSelectClub = vi.fn()
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      render(<ClubSelector onSelectClub={onSelectClub} />)
      
      await waitFor(() => {
        expect(screen.getByText('FC Bayern Munich')).toBeInTheDocument()
      })
      
      const bayernButton = screen.getByText('FC Bayern Munich').closest('button')
      const dortmundButton = screen.getByText('Borussia Dortmund').closest('button')
      
      fireEvent.click(bayernButton)
      fireEvent.click(dortmundButton)
      fireEvent.click(bayernButton)
      
      expect(onSelectClub).toHaveBeenCalledTimes(3)
      expect(onSelectClub).toHaveLastReturnedWith(undefined)
    })
  })

  describe('Accessibility', () => {
    it('should have proper button elements for club cards', async () => {
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
      })
    })

    it('should have title attributes for club cards', async () => {
      api.fetchClubs.mockResolvedValue({ clubs: mockClubs })
      
      const { container } = render(<ClubSelector onSelectClub={vi.fn()} />)
      
      await waitFor(() => {
        const buttons = container.querySelectorAll('button')
        const bayernButton = Array.from(buttons).find(btn => btn.textContent.includes('Bayern'))
        expect(bayernButton).toHaveAttribute('title', 'FC Bayern Munich (FCB)')
      })
    })
  })
})
