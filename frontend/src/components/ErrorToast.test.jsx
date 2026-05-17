import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorToast from './ErrorToast';

describe('ErrorToast Component', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders error message', () => {
    render(<ErrorToast message="Something went wrong" onRetry={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('has role="alert" for accessibility', () => {
    render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
  });

  it('has aria-live="assertive" for accessibility', () => {
    const { container } = render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    const toast = container.querySelector('[aria-live="assertive"]');
    expect(toast).toBeInTheDocument();
  });

  it('renders Retry button', () => {
    render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('renders Dismiss button', () => {
    render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();
  });

  it('calls onRetry when Retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorToast message="Error" onRetry={onRetry} onDismiss={() => {}} />);
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when Dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('hides toast when Dismiss button is clicked', () => {
    const { container } = render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    
    const toast = container.querySelector('[role="alert"]');
    expect(toast).not.toBeInTheDocument();
  });

  it('auto-dismisses after 5 seconds when autoDismiss is true', () => {
    const onDismiss = vi.fn();
    const { container, rerender } = render(
      <ErrorToast message="Error" onRetry={() => {}} onDismiss={onDismiss} autoDismiss={true} />
    );
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    
    vi.advanceTimersByTime(5000);
    
    // Rerender to trigger state update
    rerender(
      <ErrorToast message="Error" onRetry={() => {}} onDismiss={onDismiss} autoDismiss={true} />
    );
    
    const toast = container.querySelector('[role="alert"]');
    expect(toast).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not auto-dismiss when autoDismiss is false', () => {
    const onDismiss = vi.fn();
    render(
      <ErrorToast message="Error" onRetry={() => {}} onDismiss={onDismiss} autoDismiss={false} />
    );
    
    vi.advanceTimersByTime(5000);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('has red background styling', () => {
    const { container } = render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass('bg-red-500');
  });

  it('has white text color', () => {
    const { container } = render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass('text-white');
  });

  it('is positioned fixed at bottom-right', () => {
    const { container } = render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass('fixed', 'bottom-4', 'right-4');
  });

  it('has shadow and rounded corners', () => {
    const { container } = render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass('rounded-lg', 'shadow-lg');
  });

  it('buttons have hover effects', () => {
    const { container } = render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    const buttons = container.querySelectorAll('button');
    
    buttons.forEach(button => {
      expect(button).toHaveClass('hover:bg-red-700');
    });
  });

  it('buttons have proper aria-labels', () => {
    render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    
    const retryButton = screen.getByRole('button', { name: /retry the failed operation/i });
    const dismissButton = screen.getByRole('button', { name: /dismiss the error message/i });
    
    expect(retryButton).toBeInTheDocument();
    expect(dismissButton).toBeInTheDocument();
  });

  it('renders with max-width constraint', () => {
    const { container } = render(<ErrorToast message="Error" onRetry={() => {}} onDismiss={() => {}} />);
    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass('max-w-sm');
  });
});
