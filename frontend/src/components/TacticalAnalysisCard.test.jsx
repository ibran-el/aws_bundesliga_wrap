import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TacticalAnalysisCard from './TacticalAnalysisCard';

describe('TacticalAnalysisCard', () => {
  const mockAnalysis = {
    synergy_score: 7.5,
    verdict: 'Promising substitution that could strengthen the midfield.',
    risk: 'Low risk - both players have similar playing styles.',
    manager_rating: 'Excellent tactical choice',
    real_time_note: 'Best made in the 60th minute when fatigue sets in.',
  };

  const mockStarter = {
    name: 'Joshua Kimmich',
    playing_position: 'Midfielder',
  };

  const mockBench = {
    name: 'Leon Goretzka',
    playing_position: 'Midfielder',
  };

  it('renders all analysis fields correctly', () => {
    const mockOnTryAnother = vi.fn();

    render(
      <TacticalAnalysisCard
        analysis={mockAnalysis}
        starter={mockStarter}
        bench={mockBench}
        onTryAnother={mockOnTryAnother}
      />
    );

    // Check title
    expect(screen.getByText('Tactical Analysis')).toBeInTheDocument();

    // Check player names
    expect(screen.getByText('Joshua Kimmich')).toBeInTheDocument();
    expect(screen.getByText('Leon Goretzka')).toBeInTheDocument();

    // Check positions (both starter and bench have same position)
    const positions = screen.getAllByText('Midfielder');
    expect(positions.length).toBeGreaterThan(0);

    // Check analysis fields
    expect(screen.getByText(/Promising substitution/)).toBeInTheDocument();
    expect(screen.getByText(/Low risk/)).toBeInTheDocument();
    expect(screen.getByText('Excellent tactical choice')).toBeInTheDocument();
    expect(screen.getByText(/60th minute/)).toBeInTheDocument();

    // Check synergy score
    expect(screen.getByText('+7.5')).toBeInTheDocument();
  });

  it('renders green gauge for positive synergy score', () => {
    const mockOnTryAnother = vi.fn();

    const { container } = render(
      <TacticalAnalysisCard
        analysis={mockAnalysis}
        starter={mockStarter}
        bench={mockBench}
        onTryAnother={mockOnTryAnother}
      />
    );

    // Check for green color classes in gauge
    const gaugeBar = container.querySelector('.bg-green-100');
    expect(gaugeBar).toBeInTheDocument();

    // Check for "Strong Synergy" or similar positive label
    expect(screen.getByText('Strong Synergy')).toBeInTheDocument();
  });

  it('renders red gauge for negative synergy score', () => {
    const mockOnTryAnother = vi.fn();
    const negativeAnalysis = {
      ...mockAnalysis,
      synergy_score: -6.5,
    };

    const { container } = render(
      <TacticalAnalysisCard
        analysis={negativeAnalysis}
        starter={mockStarter}
        bench={mockBench}
        onTryAnother={mockOnTryAnother}
      />
    );

    // Check for red color classes in gauge
    const gaugeBar = container.querySelector('.bg-red-100');
    expect(gaugeBar).toBeInTheDocument();

    // Check for negative score display
    expect(screen.getByText('-6.5')).toBeInTheDocument();

    // Check for risk label
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('renders gray gauge for zero synergy score', () => {
    const mockOnTryAnother = vi.fn();
    const neutralAnalysis = {
      ...mockAnalysis,
      synergy_score: 0,
    };

    const { container } = render(
      <TacticalAnalysisCard
        analysis={neutralAnalysis}
        starter={mockStarter}
        bench={mockBench}
        onTryAnother={mockOnTryAnother}
      />
    );

    // Check for gray color classes in gauge
    const gaugeBar = container.querySelector('.bg-gray-100');
    expect(gaugeBar).toBeInTheDocument();

    // Check for neutral score display
    expect(screen.getByText('0.0')).toBeInTheDocument();

    // Check for neutral label
    expect(screen.getByText('Neutral')).toBeInTheDocument();
  });

  it('calls onTryAnother when button is clicked', async () => {
    const mockOnTryAnother = vi.fn();
    const user = userEvent.setup();

    render(
      <TacticalAnalysisCard
        analysis={mockAnalysis}
        starter={mockStarter}
        bench={mockBench}
        onTryAnother={mockOnTryAnother}
      />
    );

    const button = screen.getByRole('button', { name: /Try Another Match/i });
    await user.click(button);

    expect(mockOnTryAnother).toHaveBeenCalledOnce();
  });

  it('displays correct synergy labels for different score ranges', () => {
    const mockOnTryAnother = vi.fn();

    const testCases = [
      { score: 9, label: 'Excellent Fit' },
      { score: 6, label: 'Strong Synergy' },
      { score: 3, label: 'Good Match' },
      { score: 1, label: 'Positive Impact' },
      { score: 0, label: 'Neutral' },
      { score: -1, label: 'Minor Risk' },
      { score: -4, label: 'Moderate Risk' },
      { score: -7, label: 'High Risk' },
      { score: -9, label: 'Poor Fit' },
    ];

    testCases.forEach(({ score, label }) => {
      const { unmount } = render(
        <TacticalAnalysisCard
          analysis={{ ...mockAnalysis, synergy_score: score }}
          starter={mockStarter}
          bench={mockBench}
          onTryAnother={mockOnTryAnother}
        />
      );

      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders player positions correctly', () => {
    const mockOnTryAnother = vi.fn();
    const customStarter = {
      name: 'Manuel Neuer',
      playing_position: 'Goalkeeper',
    };
    const customBench = {
      name: 'Sven Ulreich',
      playing_position: 'Goalkeeper',
    };

    render(
      <TacticalAnalysisCard
        analysis={mockAnalysis}
        starter={customStarter}
        bench={customBench}
        onTryAnother={mockOnTryAnother}
      />
    );

    expect(screen.getByText('Manuel Neuer')).toBeInTheDocument();
    expect(screen.getByText('Sven Ulreich')).toBeInTheDocument();

    // Check positions (both starter and bench have same position)
    const positions = screen.getAllByText('Goalkeeper');
    expect(positions.length).toBe(2);
  });

  it('handles missing data gracefully', () => {
    const mockOnTryAnother = vi.fn();

    const { rerender } = render(
      <TacticalAnalysisCard
        analysis={null}
        starter={null}
        bench={null}
        onTryAnother={mockOnTryAnother}
      />
    );

    expect(screen.getByText('No analysis data available')).toBeInTheDocument();

    // Rerender with partial data
    rerender(
      <TacticalAnalysisCard
        analysis={mockAnalysis}
        starter={mockStarter}
        bench={null}
        onTryAnother={mockOnTryAnother}
      />
    );

    expect(screen.getByText('No analysis data available')).toBeInTheDocument();
  });

  it('displays synergy score with correct sign', () => {
    const mockOnTryAnother = vi.fn();

    const { rerender } = render(
      <TacticalAnalysisCard
        analysis={{ ...mockAnalysis, synergy_score: 5 }}
        starter={mockStarter}
        bench={mockBench}
        onTryAnother={mockOnTryAnother}
      />
    );

    expect(screen.getByText('+5.0')).toBeInTheDocument();

    rerender(
      <TacticalAnalysisCard
        analysis={{ ...mockAnalysis, synergy_score: -3 }}
        starter={mockStarter}
        bench={mockBench}
        onTryAnother={mockOnTryAnother}
      />
    );

    expect(screen.getByText('-3.0')).toBeInTheDocument();
  });

  it('renders with proper accessibility attributes', () => {
    const mockOnTryAnother = vi.fn();

    render(
      <TacticalAnalysisCard
        analysis={mockAnalysis}
        starter={mockStarter}
        bench={mockBench}
        onTryAnother={mockOnTryAnother}
      />
    );

    const button = screen.getByRole('button', { name: /Try Another Match/i });
    expect(button).toHaveAttribute('aria-label');
  });
});
