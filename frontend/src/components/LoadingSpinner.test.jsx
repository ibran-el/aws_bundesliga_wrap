import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders with default message', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('has aria-live="polite" for accessibility', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[aria-live="polite"]');
    expect(spinner).toBeInTheDocument();
  });

  it('has aria-label with the message', () => {
    const { container } = render(<LoadingSpinner message="Loading clubs..." />);
    const spinner = container.querySelector('[aria-label="Loading clubs..."]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders spinning animation element', () => {
    const { container } = render(<LoadingSpinner />);
    const spinningElement = container.querySelector('.animate-spin');
    expect(spinningElement).toBeInTheDocument();
  });

  it('has proper styling classes', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.querySelector('[aria-live="polite"]');
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'py-12');
  });

  it('displays message with gray text color', () => {
    const { container } = render(<LoadingSpinner message="Loading..." />);
    const message = container.querySelector('.text-gray-600');
    expect(message).toBeInTheDocument();
    expect(message).toHaveClass('text-sm');
  });

  it('has spinner with border styling', () => {
    const { container } = render(<LoadingSpinner />);
    const spinnerContainer = container.querySelector('.relative');
    expect(spinnerContainer).toHaveClass('w-12', 'h-12', 'mb-4');
  });

  it('renders centered layout', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.querySelector('[aria-live="polite"]');
    expect(wrapper).toHaveClass('items-center', 'justify-center');
  });

  it('message is positioned below spinner', () => {
    const { container } = render(<LoadingSpinner message="Test" />);
    const spinnerDiv = container.querySelector('.relative');
    const messageDiv = container.querySelector('.text-gray-600');
    
    // Check that spinner has margin-bottom to create space
    expect(spinnerDiv).toHaveClass('mb-4');
    expect(messageDiv).toBeInTheDocument();
  });
});
