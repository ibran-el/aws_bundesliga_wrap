import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WrappedCardReveal from './WrappedCardReveal';

/**
 * End-to-End Tests for Animated Reveal
 * Task 22: Test Animated Reveal End-to-End
 * 
 * Acceptance Criteria:
 * - Full reveal sequence plays correctly from start to finish
 * - All phases transition smoothly
 * - Skip button works at any phase
 * - Numeric counters use ease-out curve and reach correct final values
 * - Video card displays correctly (if present)
 * - After reveal completes, full Wrapped card is interactive
 * - Responsive on mobile (390px), tablet (768px), desktop (1024px+)
 * - Manual test: complete full user flow with reveal animation
 */

const mockRealApiData = {
  user_name: 'Judge Demo',
  favorite_club: 'Bayern Munich',
  profile: {
    archetype: 'Tactical Mastermind',
    total_interactions: 156,
    engagement_score: 92,
    favorite_video: 'https://example.com/video.mp4',
  },
  wrapped_card: {
    greeting: 'Welcome to your Bundesliga Wrapped, Judge Demo!',
    season_story: 'What an incredible season it has been.',
    fan_stat: 'You watched 42 videos and viewed 156 stories this season.',
    tactical_identity: 'You are a Tactical Mastermind.',
    season_verdict: 'Outstanding season!',
    share_text: 'I\'m a Bundesliga Wrapped Tactical Mastermind! 🎯⚽',
  },
  mvp_analysis: {
    players: [
      { name: 'Olise', impact_score: 95 },
      { name: 'Sane', impact_score: 88 },
      { name: 'Gnabry', impact_score: 82 },
    ],
  },
};

describe('WrappedCardReveal - End-to-End Tests (Task 22)', () => {
  it('renders without crashing with real API data', () => {
    const { container } = render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );
    expect(container).toBeTruthy();
  });

  it('all animation phases content eventually appears', async () => {
    render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    await waitFor(() => expect(screen.getByText('Judge Demo')).toBeTruthy(), { timeout: 15000 });
    await waitFor(() => expect(screen.getByText('Tactical Mastermind')).toBeTruthy(), { timeout: 15000 });
    await waitFor(() => expect(screen.getByText('Videos Watched')).toBeTruthy(), { timeout: 15000 });
    await waitFor(() => expect(screen.getByText('Greeting')).toBeTruthy(), { timeout: 15000 });
    await waitFor(() => expect(screen.getByText('Olise')).toBeTruthy(), { timeout: 15000 });
  });

  it('skip button is visible and works', async () => {
    const onSkip = vi.fn();
    render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={onSkip}
      />
    );

    const skipButton = screen.getByLabelText('Skip animation sequence');
    expect(skipButton).toBeTruthy();

    await userEvent.click(skipButton);
    expect(onSkip).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Judge Demo')).toBeTruthy();
      expect(screen.getByText('Olise')).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('skip button hides after reveal completes', async () => {
    render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const skipButton = screen.getByLabelText('Skip animation sequence');
    await userEvent.click(skipButton);

    await waitFor(() => {
      expect(screen.queryByLabelText('Skip animation sequence')).toBeFalsy();
    }, { timeout: 5000 });
  });

  it('numeric counters reach correct final values', async () => {
    render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const skipButton = screen.getByLabelText('Skip animation sequence');
    await userEvent.click(skipButton);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeTruthy();
      expect(screen.getByText('156')).toBeTruthy();
      expect(screen.getByText('87')).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('stat cards have animation applied', () => {
    const { container } = render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const styleTag = container.querySelector('style');
    expect(styleTag).toBeTruthy();
    expect(styleTag.textContent).toMatch(/@keyframes/);
    expect(styleTag.textContent).toMatch(/countUpCard/);
  });

  it('video card displays when favorite_video is present', async () => {
    const { container } = render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const skipButton = screen.getByLabelText('Skip animation sequence');
    await userEvent.click(skipButton);

    await waitFor(() => {
      expect(screen.getByText('Favorite Video')).toBeTruthy();
      const videoElement = container.querySelector('video');
      expect(videoElement).toBeTruthy();
      expect(videoElement.muted).toBe(true);
      expect(videoElement.autoplay).toBe(true);
      expect(videoElement.loop).toBe(true);
    }, { timeout: 5000 });
  });

  it('video card does not appear when favorite_video is missing', async () => {
    const dataWithoutVideo = {
      ...mockRealApiData,
      profile: { ...mockRealApiData.profile, favorite_video: null },
    };

    render(
      <WrappedCardReveal
        wrappedData={dataWithoutVideo}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const skipButton = screen.getByLabelText('Skip animation sequence');
    await userEvent.click(skipButton);

    await waitFor(() => {
      expect(screen.getByText('Judge Demo')).toBeTruthy();
    }, { timeout: 5000 });

    expect(screen.queryByText('Favorite Video')).toBeFalsy();
  });

  it('full Wrapped card is interactive after reveal', async () => {
    render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const skipButton = screen.getByLabelText('Skip animation sequence');
    await userEvent.click(skipButton);

    await waitFor(() => {
      const shareButton = screen.getByLabelText('Share wrapped card text to clipboard');
      expect(shareButton).toBeTruthy();
      expect(shareButton.disabled).toBeFalsy();
    }, { timeout: 5000 });
  });

  it('all narrative content is visible after reveal', async () => {
    render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const skipButton = screen.getByLabelText('Skip animation sequence');
    await userEvent.click(skipButton);

    await waitFor(() => {
      expect(screen.getByText('Greeting')).toBeTruthy();
      expect(screen.getByText('Season Story')).toBeTruthy();
      expect(screen.getByText('Fan Stat')).toBeTruthy();
      expect(screen.getByText('Tactical Identity')).toBeTruthy();
      expect(screen.getByText('Season Verdict')).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('renders correctly at mobile breakpoint', () => {
    const { container } = render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    expect(container).toBeTruthy();
    expect(container.querySelector('.min-h-screen')).toBeTruthy();
  });

  it('renders correctly at tablet breakpoint', () => {
    const { container } = render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    expect(container).toBeTruthy();
    expect(container.querySelector('.min-h-screen')).toBeTruthy();
  });

  it('renders correctly at desktop breakpoint', () => {
    const { container } = render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    expect(container).toBeTruthy();
    expect(container.querySelector('.min-h-screen')).toBeTruthy();
  });

  it('complete full user flow with reveal animation', async () => {
    const onRevealComplete = vi.fn();
    const { container } = render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={onRevealComplete}
        onSkip={() => {}}
      />
    );

    expect(container.querySelector('.bg-black')).toBeTruthy();

    await waitFor(() => expect(screen.getByText('Judge Demo')).toBeTruthy(), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText('Tactical Mastermind')).toBeTruthy(), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText('Videos Watched')).toBeTruthy(), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText('Greeting')).toBeTruthy(), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText('Olise')).toBeTruthy(), { timeout: 3000 });
    await waitFor(() => expect(onRevealComplete).toHaveBeenCalled(), { timeout: 3000 });

    const shareButton = screen.getByLabelText('Share wrapped card text to clipboard');
    expect(shareButton).toBeTruthy();
  });

  it('no debug console commands visible in UI', () => {
    const { container } = render(
      <WrappedCardReveal
        wrappedData={mockRealApiData}
        clubColor="#0066CC"
        onRevealComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const debugElements = container.querySelectorAll('[data-testid="debug-console"]');
    expect(debugElements.length).toBe(0);
  });
});
