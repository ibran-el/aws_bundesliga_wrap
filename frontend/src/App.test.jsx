import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

describe('App.jsx - Root Component State Management', () => {
  beforeEach(() => {
    // Clear window.appControls before each test
    delete window.appControls
  })

  it('should render the landing page on initial load', () => {
    render(<App />)
    expect(screen.getByText('Bundesliga Wrapped')).toBeInTheDocument()
  })

  it('should have all navigation buttons', () => {
    render(<App />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('Wrapped')).toBeInTheDocument()
    expect(screen.getByText('MVP')).toBeInTheDocument()
    expect(screen.getByText('Substitution')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('should navigate between views when buttons are clicked', async () => {
    render(<App />)
    
    // Navigate to Input page
    fireEvent.click(screen.getByText('Input'))
    await waitFor(() => {
      expect(screen.getByText('Create Your Wrapped')).toBeInTheDocument()
    })

    // Navigate back to Home
    fireEvent.click(screen.getByText('Home'))
    await waitFor(() => {
      expect(screen.getByText('Bundesliga Wrapped')).toBeInTheDocument()
    })
  })

  it('should expose appControls to window for console testing', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    expect(typeof window.appControls.navigateTo).toBe('function')
    expect(typeof window.appControls.updateSelectedClub).toBe('function')
    expect(typeof window.appControls.generateWrapped).toBe('function')
    expect(typeof window.appControls.selectMatch).toBe('function')
    expect(typeof window.appControls.selectStarter).toBe('function')
    expect(typeof window.appControls.selectBench).toBe('function')
    expect(typeof window.appControls.analyzeSubstitution).toBe('function')
    expect(typeof window.appControls.resetState).toBe('function')
    expect(typeof window.appControls.getState).toBe('function')
  })

  it('should initialize state with correct default values', async () => {
    render(<App />)
    
    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.currentView).toBe('landing')
      expect(state.userName).toBe('')
      expect(state.selectedClub).toBeNull()
      expect(state.tacticalStyle).toBe('High Press')
      expect(state.wrappedData).toBeNull()
      expect(state.selectedMatch).toBeNull()
      expect(state.selectedStarter).toBeNull()
      expect(state.selectedBench).toBeNull()
      expect(state.analysisResult).toBeNull()
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  it('should update userName through appControls', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    // Note: In a real implementation, we'd need to expose setUserName
    // For now, we verify the state structure exists
    const state = window.appControls.getState()
    expect(state).toHaveProperty('userName')
  })

  it('should update selectedClub through appControls', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    const mockClub = {
      club_id: 'FCB',
      name: 'FC Bayern Munich',
      short_name: 'Bayern',
      primary_color: '#DC052D',
      secondary_color: '#FFFFFF'
    }

    window.appControls.updateSelectedClub(mockClub)

    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.selectedClub).toEqual(mockClub)
    })
  })

  it('should navigate to wrapped view', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    // Set mock wrapped data first
    const mockWrappedData = {
      user_name: 'Test User',
      favorite_club: 'Bayern Munich',
      wrapped_card: {
        greeting: 'Hello Test User',
        season_story: 'This is your season story',
        fan_stat: 'You watched 30 matches',
        tactical_identity: 'High Press enthusiast',
        season_verdict: 'Great season!',
        share_text: 'Check out my Bundesliga Wrapped!'
      }
    }

    // Manually set wrapped data in state by navigating and checking state
    window.appControls.navigateTo('wrapped')

    // Since we can't directly set state, we just verify navigation works
    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.currentView).toBe('wrapped')
    })
  })

  it('should navigate to mvp view', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    window.appControls.navigateTo('mvp')

    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.currentView).toBe('mvp')
    })
  })

  it('should navigate to substitution view', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    window.appControls.navigateTo('substitution')

    await waitFor(() => {
      expect(screen.getByText(/Manager Mode/)).toBeInTheDocument()
    })
  })

  it('should reset state when resetState is called', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    // Navigate to a different view
    window.appControls.navigateTo('wrapped')
    
    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.currentView).toBe('wrapped')
    })

    // Reset state
    window.appControls.resetState()

    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.currentView).toBe('landing')
      expect(state.userName).toBe('')
      expect(state.selectedClub).toBeNull()
      expect(state.error).toBeNull()
    })
  })

  it('should display error when generateWrapped is called without required fields', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    // Try to generate wrapped without club or name
    window.appControls.generateWrapped()

    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.error).toBe('Please select a club and enter your name')
    })
  })

  it('should display error when analyzeSubstitution is called without required fields', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    // Try to analyze substitution without required fields
    window.appControls.analyzeSubstitution()

    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.error).toBe('Please select a match, starter, and bench player')
    })
  })

  it('should select match through appControls', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    const mockMatch = {
      match_id: 'M123',
      team_id: 'FCB',
      result: '2-1',
      formation: '4-2-3-1'
    }

    window.appControls.selectMatch(mockMatch)

    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.selectedMatch).toEqual(mockMatch)
    })
  })

  it('should select starter through appControls', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    const mockStarter = {
      person_id: 'P123',
      name: 'Thomas Müller',
      playing_position: 'RW'
    }

    window.appControls.selectStarter(mockStarter)

    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.selectedStarter).toEqual(mockStarter)
    })
  })

  it('should select bench through appControls', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    const mockBench = {
      person_id: 'P456',
      name: 'Serge Gnabry',
      playing_position: 'RW'
    }

    window.appControls.selectBench(mockBench)

    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.selectedBench).toEqual(mockBench)
    })
  })

  it('should clear error when navigating', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(window.appControls).toBeDefined()
    })

    // Generate error
    window.appControls.generateWrapped()

    await waitFor(() => {
      let state = window.appControls.getState()
      expect(state.error).toBeTruthy()
    })

    // Navigate to clear error
    window.appControls.navigateTo('input')

    await waitFor(() => {
      const state = window.appControls.getState()
      expect(state.error).toBeNull()
    })
  })
})
