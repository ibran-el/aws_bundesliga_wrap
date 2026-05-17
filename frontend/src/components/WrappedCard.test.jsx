import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WrappedCard from './WrappedCard';

describe('WrappedCard Component', () => {
  const mockWrappedData = {
    user_name: 'John Doe',
    favorite_club: 'FC Bayern Munich',
    wrapped_card: {
      greeting: 'Welcome to your Bundesliga Wrapped, John!',
      season_story: 'This season, you watched 45 matches and cheered for every goal. Your passion for Bayern never wavered.',
      fan_stat: 'You were in the top 5% of most engaged fans this season.',
      tactical_identity: 'You prefer a high-press, aggressive attacking style.',
      season_verdict: 'An unforgettable season of passion and tactical brilliance.',
      share_text: 'I was in the top 5% of Bayern fans this season! Check out my Bundesliga Wrapped: The Manager\'s Wrapped.',
    },
  };

  const mockClubColor = '#DC052D'; // Bayern red

  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  });

  it('renders all wrapped_card fields in order', () => {
    const onNext = vi.fn();
    render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={mockClubColor}
        onNext={onNext}
      />
    );

    // Check header
    expect(screen.getByText('Your Bundesliga Wrapped 2024–25')).toBeInTheDocument();
    expect(screen.getByText(/John Doe.*FC Bayern Munich/)).toBeInTheDocument();

    // Check all narrative fields
    expect(screen.getByText(mockWrappedData.wrapped_card.greeting)).toBeInTheDocument();
    expect(screen.getByText(mockWrappedData.wrapped_card.season_story)).toBeInTheDocument();
    expect(screen.getByText(mockWrappedData.wrapped_card.fan_stat)).toBeInTheDocument();
    expect(screen.getByText(mockWrappedData.wrapped_card.tactical_identity)).toBeInTheDocument();
    expect(screen.getByText(mockWrappedData.wrapped_card.season_verdict)).toBeInTheDocument();
    // Check share_text is in the document (it's wrapped in quotes in a p tag)
    const shareTextElements = screen.getAllByText((content, element) => {
      return element && element.textContent.includes(mockWrappedData.wrapped_card.share_text);
    });
    expect(shareTextElements.length).toBeGreaterThan(0);
  });

  it('renders full-screen card with club color background', () => {
    const onNext = vi.fn();
    const { container } = render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={mockClubColor}
        onNext={onNext}
      />
    );

    const card = container.querySelector('div[style*="background-color"]');
    expect(card).toHaveStyle(`background-color: ${mockClubColor}`);
  });

  it('renders Share button that copies share_text to clipboard', async () => {
    const onNext = vi.fn();
    render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={mockClubColor}
        onNext={onNext}
      />
    );

    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toBeInTheDocument();

    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        mockWrappedData.wrapped_card.share_text
      );
    });
  });

  it('shows confirmation toast after share button click', async () => {
    const onNext = vi.fn();
    render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={mockClubColor}
        onNext={onNext}
      />
    );

    const shareButton = screen.getByRole('button', { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText('Copied to clipboard!')).toBeInTheDocument();
    });
  });

  it('calls onNext when Next button is clicked', () => {
    const onNext = vi.fn();
    render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={mockClubColor}
        onNext={onNext}
      />
    );

    const nextButton = screen.getByRole('button', { name: /continue to mvp/i });
    fireEvent.click(nextButton);

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('handles missing wrapped_card gracefully', () => {
    const onNext = vi.fn();
    const incompleteData = {
      user_name: 'John Doe',
      favorite_club: 'FC Bayern Munich',
    };

    render(
      <WrappedCard
        wrappedData={incompleteData}
        clubColor={mockClubColor}
        onNext={onNext}
      />
    );

    expect(screen.getByText('No wrapped data available')).toBeInTheDocument();
  });

  it('handles clipboard copy failure gracefully', async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Copy failed'));

    const onNext = vi.fn();
    render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={mockClubColor}
        onNext={onNext}
      />
    );

    const shareButton = screen.getByRole('button', { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to copy. Please try again.')).toBeInTheDocument();
    });
  });

  it('uses correct text color for light backgrounds', () => {
    const onNext = vi.fn();
    const lightColor = '#FFFFFF'; // White background

    const { container } = render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={lightColor}
        onNext={onNext}
      />
    );

    const card = container.querySelector('div[style*="background-color"]');
    expect(card).toHaveClass('text-gray-900'); // Dark text for light background
  });

  it('uses correct text color for dark backgrounds', () => {
    const onNext = vi.fn();
    const darkColor = '#000000'; // Black background

    const { container } = render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={darkColor}
        onNext={onNext}
      />
    );

    const card = container.querySelector('div[style*="background-color"]');
    expect(card).toHaveClass('text-white'); // Light text for dark background
  });

  it('renders responsive layout with proper spacing', () => {
    const onNext = vi.fn();
    const { container } = render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={mockClubColor}
        onNext={onNext}
      />
    );

    // Check for responsive classes
    const card = container.querySelector('div.max-w-2xl');
    expect(card).toHaveClass('p-8', 'md:p-12');

    // Check for responsive button layout
    const buttonContainer = container.querySelector('div.flex.flex-col.sm\\:flex-row');
    expect(buttonContainer).toBeInTheDocument();
  });

  it('renders section headings for narrative sections', () => {
    const onNext = vi.fn();
    render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={mockClubColor}
        onNext={onNext}
      />
    );

    expect(screen.getByText('Your Season Story')).toBeInTheDocument();
    expect(screen.getByText('Your Fan Stat')).toBeInTheDocument();
    expect(screen.getByText('Your Tactical Identity')).toBeInTheDocument();
    expect(screen.getByText('Season Verdict')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    const onNext = vi.fn();
    render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={mockClubColor}
        onNext={onNext}
      />
    );

    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toHaveAttribute('aria-label');

    const nextButton = screen.getByRole('button', { name: /continue to mvp/i });
    expect(nextButton).toHaveAttribute('aria-label');
  });

  it('renders with default color when clubColor is not provided', () => {
    const onNext = vi.fn();
    const { container } = render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={null}
        onNext={onNext}
      />
    );

    const card = container.querySelector('div[style*="background-color"]');
    expect(card).toHaveStyle('background-color: #3B82F6'); // Default blue
  });

  it('displays share_text in a highlighted section', () => {
    const onNext = vi.fn();
    render(
      <WrappedCard
        wrappedData={mockWrappedData}
        clubColor={mockClubColor}
        onNext={onNext}
      />
    );

    const shareTextElements = screen.getAllByText((content, element) => {
      return element && element.textContent.includes(mockWrappedData.wrapped_card.share_text);
    });
    expect(shareTextElements.length).toBeGreaterThan(0);
    // Check that at least one of them is in a section with the right classes
    const inSection = shareTextElements.some(el => {
      const section = el.closest('section');
      return section && section.classList.contains('p-4');
    });
    expect(inSection).toBe(true);
  });
});
