import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MVPCard from './MVPCard';

describe('MVPCard Component', () => {
  const mockPlayer = {
    name: 'Serge Gnabry',
    impact_score: 87.5,
    goal_participations: 12,
    xg: 8.3,
    xg_efficiency: 1.45,
    distance_per90_km: 10.2,
    max_speed_kmh: 32.5,
  };

  const mockScoutReport = {
    headline: 'The Winger Extraordinaire',
    scout_report: 'Gnabry has been a consistent threat on the right flank, combining pace with precision. His ability to cut inside and create chances has been invaluable to Bayern\'s attacking play. A season of maturity and tactical awareness.',
    season_label: 'Consistent Performer',
    shareable_line: 'Gnabry: The winger who delivers when it matters most.',
  };

  it('renders player name and rank badge', () => {
    render(
      <MVPCard rank={1} player={mockPlayer} scoutReport={mockScoutReport} />
    );

    expect(screen.getByText('Serge Gnabry')).toBeInTheDocument();
    expect(screen.getByText('🥇 1st')).toBeInTheDocument();
  });

  it('renders impact score correctly', () => {
    render(
      <MVPCard rank={1} player={mockPlayer} scoutReport={mockScoutReport} />
    );

    expect(screen.getByText('87.5')).toBeInTheDocument();
    expect(screen.getByText('Impact Score')).toBeInTheDocument();
  });

  it('renders all player stats in grid', () => {
    render(
      <MVPCard rank={1} player={mockPlayer} scoutReport={mockScoutReport} />
    );

    // Check for stat labels
    expect(screen.getByText('Goal Participations')).toBeInTheDocument();
    expect(screen.getByText('xG')).toBeInTheDocument();
    expect(screen.getByText('xG Efficiency')).toBeInTheDocument();
    expect(screen.getByText('Distance/90 (km)')).toBeInTheDocument();
    expect(screen.getByText('Max Speed (km/h)')).toBeInTheDocument();

    // Check for stat values
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8.30')).toBeInTheDocument();
    expect(screen.getByText('1.45')).toBeInTheDocument();
    expect(screen.getByText('10.2')).toBeInTheDocument();
    expect(screen.getByText('32.5')).toBeInTheDocument();
  });

  it('renders scout report headline', () => {
    render(
      <MVPCard rank={1} player={mockPlayer} scoutReport={mockScoutReport} />
    );

    expect(screen.getByText('The Winger Extraordinaire')).toBeInTheDocument();
  });

  it('renders scout report text', () => {
    render(
      <MVPCard rank={1} player={mockPlayer} scoutReport={mockScoutReport} />
    );

    expect(screen.getByText(/Gnabry has been a consistent threat/)).toBeInTheDocument();
  });

  it('renders season label badge', () => {
    render(
      <MVPCard rank={1} player={mockPlayer} scoutReport={mockScoutReport} />
    );

    expect(screen.getByText('Consistent Performer')).toBeInTheDocument();
  });

  it('renders correct rank badge for 2nd place', () => {
    render(
      <MVPCard rank={2} player={mockPlayer} scoutReport={mockScoutReport} />
    );

    expect(screen.getByText('🥈 2nd')).toBeInTheDocument();
  });

  it('renders correct rank badge for 3rd place', () => {
    render(
      <MVPCard rank={3} player={mockPlayer} scoutReport={mockScoutReport} />
    );

    expect(screen.getByText('🥉 3rd')).toBeInTheDocument();
  });

  it('handles missing scout report gracefully', () => {
    render(
      <MVPCard rank={1} player={mockPlayer} scoutReport={null} />
    );

    expect(screen.getByText('No player data available')).toBeInTheDocument();
  });

  it('handles missing player data gracefully', () => {
    render(
      <MVPCard rank={1} player={null} scoutReport={mockScoutReport} />
    );

    expect(screen.getByText('No player data available')).toBeInTheDocument();
  });

  it('formats stats with correct decimal places', () => {
    const playerWithDecimals = {
      ...mockPlayer,
      xg: 8.3456,
      xg_efficiency: 1.4567,
      distance_per90_km: 10.2345,
      max_speed_kmh: 32.5678,
    };

    render(
      <MVPCard rank={1} player={playerWithDecimals} scoutReport={mockScoutReport} />
    );

    // xG should be formatted to 2 decimals
    expect(screen.getByText('8.35')).toBeInTheDocument();
    // xG Efficiency should be formatted to 2 decimals
    expect(screen.getByText('1.46')).toBeInTheDocument();
    // Distance should be formatted to 1 decimal
    expect(screen.getByText('10.2')).toBeInTheDocument();
    // Max Speed should be formatted to 1 decimal
    expect(screen.getByText('32.6')).toBeInTheDocument();
  });

  it('handles null stat values gracefully', () => {
    const playerWithNullStats = {
      name: 'Test Player',
      impact_score: 75,
      goal_participations: null,
      xg: undefined,
      xg_efficiency: null,
      distance_per90_km: 9.5,
      max_speed_kmh: 31.0,
    };

    render(
      <MVPCard rank={1} player={playerWithNullStats} scoutReport={mockScoutReport} />
    );

    // Should display N/A for null/undefined values
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThan(0);
  });

  it('renders Season Statistics header', () => {
    render(
      <MVPCard rank={1} player={mockPlayer} scoutReport={mockScoutReport} />
    );

    expect(screen.getByText('Season Statistics')).toBeInTheDocument();
  });
});
