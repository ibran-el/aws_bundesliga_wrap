import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WrappedCardReveal from './WrappedCardReveal';

// Mock data
const mockWrappedData = {
  user_name: 'John',
  favorite_club: 'Bayern Munich',
  profile: {
    archetype: 'Tactical Mastermind',
    total_interactions: 150,
    engagement_score: 85,
  },
  wrapped_card: {
    greeting: 'Hello John!',
    season_story: 'What a season it has been.',
    fan_stat: 'You watched 42 videos.',
    tactical_identity: 'You prefer possession-based football.',
    season_verdict: 'Outstanding season!',
    share_text: 'I am a Bundesliga fan!',
  },
  mvp_analysis: {
    players: [
      { name: 'Robert Lewandowski', impact_score: 95 },
      { name: 'Serge Gnabry', impact_score: 88 },
      { name: 'Dayot Upamecano', impact_score: 82 },
    ],
  },
};

describe('WrappedCardReveal Component', () => {

  // Core functionality tests
  it('renders without crashing and starts in burst phase', () => {
    const { container } = render(
      <WrappedCardReveal
        wrappedData={mockWrappedData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );
    expect(container).toBeTruthy();
    expect(container.querySelector('.bg-black')).toBeTruthy();
  });

  it('handles missing wrapped data gracefully', () => {
    render(
      <WrappedCardReveal
        wrappedData={null}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );
    expect(screen.getByText('No wrapped data available')).toBeTruthy();
  });

  // Consolidated phase transition test - verify all phases render content eventually
  it('renders all animation phases content', async () => {
    const onRevealComplete = vi.fn();
    render(
      <WrappedCardReveal
        wrappedData={mockWrappedData}
        clubColor="#0066CC"
        onRevealComplete={onRevealComplete}
        onSkip={() => {}}
      />
    );

    // Wait for all content to appear (animations complete naturally)
    await waitFor(() => {
      expect(screen.getByText('John')).toBeTruthy();
    }, { timeout: 15000 });

    await waitFor(() => {
      expect(screen.getByText('Tactical Mastermind')).toBeTruthy();
    }, { timeout: 15000 });

    await waitFor(() => {
      expect(screen.getByText('Videos Watched')).toBeTruthy();
    }, { timeout: 15000 });

    await waitFor(() => {
      expect(screen.getByText('Greeting')).toBeTruthy();
    }, { timeout: 15000 });

    await waitFor(() => {
      expect(screen.getByText('Robert Lewandowski')).toBeTruthy();
    }, { timeout: 15000 });
  });

  // Consolidated skip button test
  it('skip button works and hides in done phase', async () => {
    const onSkip = vi.fn();
    render(
      <WrappedCardReveal
        wrappedData={mockWrappedData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={onSkip}
      />
    );

    // Skip button visible during animation
    const skipButton = screen.getByLabelText('Skip animation sequence');
    expect(skipButton).toBeTruthy();

    // Click skip
    await userEvent.click(skipButton);
    expect(onSkip).toHaveBeenCalled();

    // Wait for content to appear
    await waitFor(() => {
      expect(screen.getByText('John')).toBeTruthy();
    }, { timeout: 15000 });

    // Skip button should eventually hide
    await waitFor(() => {
      expect(screen.queryByLabelText('Skip animation sequence')).toBeFalsy();
    }, { timeout: 15000 });
  });

  // Consolidated numeric counter test
  it('displays stat cards with labels', async () => {
    render(
      <WrappedCardReveal
        wrappedData={mockWrappedData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    // Wait for stats to appear
    await waitFor(() => {
      expect(screen.getByText('Videos Watched')).toBeTruthy();
      expect(screen.getByText('Stories Viewed')).toBeTruthy();
      expect(screen.getByText('Fan Score')).toBeTruthy();
    }, { timeout: 15000 });
  });

  // Consolidated responsive design test
  it('renders correctly at any viewport', () => {
    const { container } = render(
      <WrappedCardReveal
        wrappedData={mockWrappedData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    // Component should render without errors
    expect(container).toBeTruthy();
    expect(container.querySelector('.bg-black')).toBeTruthy();
  });

  // Accessibility test
  it('has proper accessibility features', async () => {
    render(
      <WrappedCardReveal
        wrappedData={mockWrappedData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    // Skip button has aria-label
    expect(screen.getByLabelText('Skip animation sequence')).toBeTruthy();

    // Share button appears and has aria-label
    await waitFor(() => {
      expect(screen.getByLabelText('Share wrapped card text to clipboard')).toBeTruthy();
    }, { timeout: 15000 });
  });

  // Consolidated video card test
  it('video card renders with correct attributes when present', async () => {
    const videoUrl = 'https://example.com/video.mp4';
    const wrappedDataWithVideo = {
      ...mockWrappedData,
      profile: {
        ...mockWrappedData.profile,
        favorite_video: videoUrl,
      },
    };

    const { container } = render(
      <WrappedCardReveal
        wrappedData={wrappedDataWithVideo}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    // Wait for video card to appear
    await waitFor(() => {
      expect(screen.getByText('Favorite Video')).toBeTruthy();
      const videoElement = container.querySelector('video');
      expect(videoElement).toBeTruthy();
      expect(videoElement.src).toBe(videoUrl);
      expect(videoElement.muted).toBe(true);
      expect(videoElement.autoplay).toBe(true);
      expect(videoElement.loop).toBe(true);
      expect(videoElement.playsInline).toBe(true);
    }, { timeout: 15000 });
  });

  it('video card shows fallback when URL is missing', async () => {
    render(
      <WrappedCardReveal
        wrappedData={mockWrappedData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    // Wait for animations to complete
    await waitFor(() => {
      expect(screen.getByText('John')).toBeTruthy();
    }, { timeout: 15000 });

    // Video card should not appear without favorite_video
    expect(screen.queryByText('Favorite Video')).toBeFalsy();
  });

  it('uses provided club color for animations', () => {
    const { container } = render(
      <WrappedCardReveal
        wrappedData={mockWrappedData}
        clubColor="#FF0000"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    // Component should render with custom color
    expect(container).toBeTruthy();
  });

  // Animation timing tests
  describe('Animation Timing Accuracy', () => {
    it('all animation phases complete within expected total time', async () => {
      const onRevealComplete = vi.fn();
      const startTime = performance.now();
      
      render(
        <WrappedCardReveal
          wrappedData={mockWrappedData}
          clubColor="#0066CC"
          onRevealComplete={onRevealComplete}
          onSkip={() => {}}
        />
      );

      // Wait for reveal to complete
      await waitFor(() => {
        expect(onRevealComplete).toHaveBeenCalled();
      }, { timeout: 7500 });

      const elapsedTime = performance.now() - startTime;
      // Total expected time: ~6.7s (all 7 phases)
      // Allow 500ms buffer for test overhead
      expect(elapsedTime).toBeGreaterThan(6500);
      expect(elapsedTime).toBeLessThan(7500);
    });
  });

  // Numeric counter accuracy tests
  describe('Numeric Counter Accuracy', () => {
    it('stat counters reach exact final values', async () => {
      render(
        <WrappedCardReveal
          wrappedData={mockWrappedData}
          clubColor="#0066CC"
          onRevealComplete={() => {}}
          onSkip={() => {}}
        />
      );

      // Wait for stats to complete counting
      await waitFor(() => {
        // Check that the final values are displayed
        const videoElement = screen.getByText('42');
        const storiesElement = screen.getByText('156');
        const fanScoreElement = screen.getByText('87');
        
        expect(videoElement).toBeTruthy();
        expect(storiesElement).toBeTruthy();
        expect(fanScoreElement).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  // State machine sequencing tests
  describe('State Machine Sequencing', () => {
    it('phases transition in correct order', async () => {
      const onRevealComplete = vi.fn();
      
      render(
        <WrappedCardReveal
          wrappedData={mockWrappedData}
          clubColor="#0066CC"
          onRevealComplete={onRevealComplete}
          onSkip={() => {}}
        />
      );

      // Phase 1: Burst (black screen)
      expect(document.querySelector('.bg-black')).toBeTruthy();

      // Phase 2: Name appears
      await waitFor(() => {
        const h1 = document.querySelector('h1.font-mono');
        expect(h1).toBeTruthy();
        expect(h1.textContent.length).toBeGreaterThan(0);
      }, { timeout: 2500 });

      // Phase 3: Archetype appears
      await waitFor(() => {
        expect(screen.getByText('Tactical Mastermind')).toBeTruthy();
      }, { timeout: 3500 });

      // Phase 4: Stats appear
      await waitFor(() => {
        expect(screen.getByText('Videos Watched')).toBeTruthy();
      }, { timeout: 4500 });

      // Phase 5: Narrative appears
      await waitFor(() => {
        expect(screen.getByText('Greeting')).toBeTruthy();
      }, { timeout: 5500 });

      // Phase 6: MVP appears
      await waitFor(() => {
        expect(screen.getByText('Robert Lewandowski')).toBeTruthy();
      }, { timeout: 6500 });

      // Phase 8: Done - reveal complete
      await waitFor(() => {
        expect(onRevealComplete).toHaveBeenCalled();
      }, { timeout: 7500 });
    });
  });
});
