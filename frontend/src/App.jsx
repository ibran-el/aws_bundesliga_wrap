import { useState, useEffect } from 'react'
import './App.css'
import { ClubSelector } from './components/ClubSelector'
import { JudgeInputForm } from './components/JudgeInputForm'
import WrappedCard from './components/WrappedCard'
import WrappedCardReveal from './components/WrappedCardReveal'
import MVPCard from './components/MVPCard'
import { MatchPicker } from './components/MatchPicker'
import { BenchSelector } from './components/BenchSelector'
import TacticalAnalysisCard from './components/TacticalAnalysisCard'
import { fetchWrapped, fetchMVP, fetchSubstitution, fetchAnalyzeSub } from './api'
import { Spinner } from './components/Spinner'
import Toast from './components/Toast'

/**
 * App.jsx - Root Component with Global State Management
 * 
 * Manages all application state and routing logic for Bundesliga Wrapped.
 * Views: landing, input, wrapped, mvp, substitution
 * 
 * State Management:
 * - currentView: which view is currently displayed
 * - User input: userName, selectedClub, tacticalStyle
 * - Data: wrappedData, mvpData, selectedMatch, selectedStarter, selectedBench, analysisResult
 * - UI: loading, error
 */

// Landing Page Component
function LandingPage({ onNavigateToInput }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-gray-900">Bundesliga Wrapped</h1>
        <p className="text-xl md:text-2xl text-gray-700 mb-6">The Manager's Wrapped: From Passive Fan to Tactical Coach</p>
        <p className="text-lg text-gray-600 mb-8">Explore your personalized season recap and tactical insights powered by AI</p>
        <button
          onClick={onNavigateToInput}
          className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
          aria-label="Start creating your wrapped"
        >
          Get Started →
        </button>
      </div>
    </div>
  )
}

// Club Selection Page Component
function ClubSelectionPage({ onClubSelected }) {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">Select Your Club</h1>
        <p className="text-gray-600 mb-8">Choose your favorite Bundesliga club to begin</p>
        <ClubSelector onSelectClub={onClubSelected} />
      </div>
    </div>
  )
}

// Judge Input Form Page Component
function InputPage({ selectedClub, onClubSelect, userName, setUserName, tacticalStyle, setTacticalStyle, onGenerateWrapped, loading }) {
  return (
    <div className="p-8">
      <JudgeInputForm
        selectedClub={selectedClub}
        userName={userName}
        onUserNameChange={setUserName}
        tacticalStyle={tacticalStyle}
        onTacticalStyleChange={setTacticalStyle}
        onGenerateWrapped={onGenerateWrapped}
        loading={loading}
        onChangeClub={() => onClubSelect(null)}
      />
    </div>
  )
}

// Wrapped Card Page Component
function WrappedPage({ wrappedData, selectedClub, onNext, revealSkipped, onSkipReveal }) {
  if (!wrappedData || !selectedClub) {
    return (
      <div className="p-8">
        <p className="text-gray-600">No wrapped data available</p>
      </div>
    )
  }

  // If reveal hasn't been skipped, show the animated reveal
  if (!revealSkipped) {
    return (
      <WrappedCardReveal
        wrappedData={wrappedData}
        clubColor={selectedClub.primary_color}
        onRevealComplete={onNext}
        onSkip={onSkipReveal}
      />
    )
  }

  // After reveal completes or is skipped, show static card
  return (
    <WrappedCard
      wrappedData={wrappedData}
      clubColor={selectedClub.primary_color}
      onNext={onNext}
    />
  )
}

// MVP Leaderboard Page Component
function MVPPage({ mvpData, wrappedData, onNext }) {
  if (!mvpData) {
    return (
      <div className="p-8">
        <p className="text-gray-600">No MVP data available</p>
      </div>
    )
  }

  const { players } = mvpData;
  
  // Get scout reports from wrappedData if available
  const scoutReports = wrappedData?.scout_report || {};

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Season MVP — Data-Driven Ranking</h2>
        <p className="text-gray-600 mb-8">Top 3 Bayern players by Impact Score</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {players && players.map((player, index) => {
            // Get scout report for this player (index 0, 1, 2)
            const playerScoutReport = scoutReports[index] || {
              headline: 'Outstanding Season',
              scout_report: 'A standout performer this season. Consistent excellence across all metrics. A key player in Bayern\'s success.',
              season_label: 'Top Performer',
            };

            return (
              <MVPCard
                key={index}
                rank={index + 1}
                player={player}
                scoutReport={playerScoutReport}
              />
            );
          })}
        </div>

        {/* Manager Mode Button */}
        <div className="mt-12 text-center">
          <button
            onClick={onNext}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            aria-label="Try Manager Mode - Tactical Substitution Simulator"
          >
            Try Manager Mode →
          </button>
        </div>
      </div>
    </div>
  )
}

// Substitution Simulator Page Component
function SubstitutionPage({
  wrappedData,
  selectedMatch,
  matchData,
  selectedStarter,
  selectedBench,
  analysisResult,
  onSelectMatch,
  onSelectStarter,
  onSelectBench,
  onAnalyzeSubstitution,
  onTryAnother,
  loading,
}) {
  // Extract matches from wrappedData if available
  const matches = wrappedData?.schedule || [];

  // If we have analysis result, show the analysis card
  if (analysisResult) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Tactical Substitution Analysis</h2>
          <p className="text-gray-600 mb-8">Bedrock-powered analysis of your proposed substitution</p>
          
          <TacticalAnalysisCard
            analysis={analysisResult.analysis}
            starter={selectedStarter}
            bench={selectedBench}
            onTryAnother={onTryAnother}
          />
        </div>
      </div>
    )
  }

  // If we have match data, show bench selector
  if (selectedMatch && matchData) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Manager Mode — Tactical Substitution Simulator</h2>
          <p className="text-gray-600 mb-8">Select a starter to remove and a bench player to bring on</p>
          
          <BenchSelector
            match={matchData}
            startingXI={matchData.starting_xi || []}
            bench={matchData.bench || []}
            selectedStarter={selectedStarter}
            selectedBench={selectedBench}
            onSelectStarter={onSelectStarter}
            onSelectBench={onSelectBench}
            onAnalyzeSubstitution={onAnalyzeSubstitution}
            loading={loading}
          />
        </div>
      </div>
    )
  }

  // Default: show match picker
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Manager Mode — Tactical Substitution Simulator</h2>
        <p className="text-gray-600 mb-8">Select a match to explore tactical substitution scenarios</p>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <MatchPicker
            matches={matches}
            onSelectMatch={onSelectMatch}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

function App() {
  // View state
  const [currentView, setCurrentView] = useState('landing')

  // User input state
  const [userName, setUserName] = useState('')
  const [selectedClub, setSelectedClub] = useState(null)
  const [tacticalStyle, setTacticalStyle] = useState('High Press')

  // Data state
  const [wrappedData, setWrappedData] = useState(null)
  const [mvpData, setMvpData] = useState(null)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [matchData, setMatchData] = useState(null)
  const [selectedStarter, setSelectedStarter] = useState(null)
  const [selectedBench, setSelectedBench] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [revealSkipped, setRevealSkipped] = useState(false)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Navigation function: Update current view
   */
  const navigateTo = (view) => {
    setCurrentView(view)
    setError(null)
  }

  /**
   * Update selected club and navigate to input form
   */
  const handleClubSelected = (club) => {
    setSelectedClub(club)
    navigateTo('input')
  }

  /**
   * Generate wrapped data by calling API
   */
  const generateWrapped = async () => {
    if (!selectedClub || !userName) {
      setError('Please select a club and enter your name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Call fetchWrapped API with user inputs
      const data = await fetchWrapped(selectedClub.name, userName, tacticalStyle)
      setWrappedData(data)
      
      // Also fetch MVP data for the next view
      const mvpResponse = await fetchMVP()
      setMvpData(mvpResponse)
      
      navigateTo('wrapped')
    } catch (err) {
      setError(err.message || 'Failed to generate wrapped card')
      console.error('Error generating wrapped:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Select a match for substitution analysis
   */
  const handleSelectMatch = async (match) => {
    setSelectedMatch(match)
    setLoading(true)
    setError(null)

    try {
      // Fetch bench players for the selected match
      // Use Bayern's team ID (assuming it's available from the match data or a constant)
      const teamId = selectedClub?.club_id || 'DFL-CLU-00000G' // Bayern's ID
      const substitutionData = await fetchSubstitution(match.match_id, teamId)
      setMatchData(substitutionData)
      
      // Reset starter and bench selections for new match
      setSelectedStarter(null)
      setSelectedBench(null)
      setAnalysisResult(null)
    } catch (err) {
      setError(err.message || 'Failed to load match data')
      console.error('Error loading match data:', err)
      setSelectedMatch(null)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Select a starter player to remove
   */
  const handleSelectStarter = (player) => {
    setSelectedStarter(player)
  }

  /**
   * Select a bench player to bring on
   */
  const handleSelectBench = (player) => {
    setSelectedBench(player)
  }

  /**
   * Analyze substitution by calling API
   */
  const handleAnalyzeSubstitution = async () => {
    if (!selectedMatch || !selectedStarter || !selectedBench) {
      setError('Please select a match, starter, and bench player')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const teamId = selectedClub?.club_id || 'DFL-CLU-00000G' // Bayern's ID
      const analysisData = await fetchAnalyzeSub(
        selectedMatch.match_id,
        teamId,
        selectedStarter.person_id,
        selectedBench.person_id
      )
      setAnalysisResult(analysisData)
    } catch (err) {
      setError(err.message || 'Failed to analyze substitution')
      console.error('Error analyzing substitution:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Try another match: reset substitution state but stay in substitution view
   */
  const handleTryAnother = () => {
    setSelectedMatch(null)
    setMatchData(null)
    setSelectedStarter(null)
    setSelectedBench(null)
    setAnalysisResult(null)
  }

  /**
   * Handle skip reveal: mark reveal as skipped and show static card
   */
  const handleSkipReveal = () => {
    setRevealSkipped(true)
  }

  /**
   * Reset all state to initial values
   */
  const resetState = () => {
    setCurrentView('landing')
    setUserName('')
    setSelectedClub(null)
    setTacticalStyle('High Press')
    setWrappedData(null)
    setMvpData(null)
    setSelectedMatch(null)
    setMatchData(null)
    setSelectedStarter(null)
    setSelectedBench(null)
    setAnalysisResult(null)
    setRevealSkipped(false)
    setLoading(false)
    setError(null)
  }

  /**
   * Expose navigation functions to window for console testing
   */
  useEffect(() => {
    window.appControls = {
      navigateTo,
      updateSelectedClub: handleClubSelected,
      generateWrapped,
      selectMatch: handleSelectMatch,
      selectStarter: handleSelectStarter,
      selectBench: handleSelectBench,
      analyzeSubstitution: handleAnalyzeSubstitution,
      tryAnother: handleTryAnother,
      skipReveal: handleSkipReveal,
      resetState,
      // State getters for inspection
      getState: () => ({
        currentView,
        userName,
        selectedClub,
        tacticalStyle,
        wrappedData,
        mvpData,
        selectedMatch,
        matchData,
        selectedStarter,
        selectedBench,
        analysisResult,
        revealSkipped,
        loading,
        error
      })
    }
  }, [currentView, userName, selectedClub, tacticalStyle, wrappedData, mvpData, selectedMatch, matchData, selectedStarter, selectedBench, analysisResult, revealSkipped, loading, error])

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage onNavigateToInput={() => navigateTo('club-select')} />
      case 'club-select':
        return <ClubSelectionPage onClubSelected={handleClubSelected} />
      case 'input':
        return (
          <InputPage
            selectedClub={selectedClub}
            onClubSelect={(club) => {
              setSelectedClub(club)
              if (!club) navigateTo('club-select')
            }}
            userName={userName}
            setUserName={setUserName}
            tacticalStyle={tacticalStyle}
            setTacticalStyle={setTacticalStyle}
            onGenerateWrapped={generateWrapped}
            loading={loading}
          />
        )
      case 'wrapped':
        return <WrappedPage wrappedData={wrappedData} selectedClub={selectedClub} onNext={() => navigateTo('mvp')} revealSkipped={revealSkipped} onSkipReveal={handleSkipReveal} />
      case 'mvp':
        return <MVPPage mvpData={mvpData} wrappedData={wrappedData} onNext={() => navigateTo('substitution')} />
      case 'substitution':
        return (
          <SubstitutionPage
            wrappedData={wrappedData}
            selectedMatch={selectedMatch}
            matchData={matchData}
            selectedStarter={selectedStarter}
            selectedBench={selectedBench}
            analysisResult={analysisResult}
            onSelectMatch={handleSelectMatch}
            onSelectStarter={handleSelectStarter}
            onSelectBench={handleSelectBench}
            onAnalyzeSubstitution={handleAnalyzeSubstitution}
            onTryAnother={handleTryAnother}
            loading={loading}
          />
        )
      default:
        return <LandingPage onNavigateToInput={() => navigateTo('club-select')} />
    }
  }

  // Determine if we can show back button
  const canGoBack = currentView !== 'landing'
  const getBackView = () => {
    switch (currentView) {
      case 'club-select':
        return 'landing'
      case 'input':
        return 'club-select'
      case 'wrapped':
        return 'input'
      case 'mvp':
        return 'wrapped'
      case 'substitution':
        return 'mvp'
      default:
        return 'landing'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with navigation */}
      <header className="bg-white shadow sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex gap-2 items-center flex-wrap">
          {/* Back button */}
          {canGoBack && (
            <button
              onClick={() => navigateTo(getBackView())}
              className="px-4 py-2 rounded font-medium transition-colors bg-gray-200 text-gray-900 hover:bg-gray-300"
              aria-label="Go back to previous view"
            >
              ← Back
            </button>
          )}
        </nav>
      </header>

      {/* Error display */}
      {error && (
        <Toast
          message={error}
          type="error"
          onDismiss={() => setError(null)}
        />
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Spinner message="Loading..." />
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto">
        {renderView()}
      </main>
    </div>
  )
}

export default App
