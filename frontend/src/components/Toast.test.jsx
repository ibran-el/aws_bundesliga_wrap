import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Toast from './Toast';

describe('Toast Component', () => {
  it('renders success toast with correct styling', () => {
    render(<Toast message="Success!" type="success" />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-green-500');
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('renders error toast with correct styling', () => {
    render(<Toast message="Error occurred" type="error" />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-red-500');
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });

  it('renders info toast with correct styling', () => {
    render(<Toast message="Info message" type="info" />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-blue-500');
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('defaults to info type when type is not specified', () => {
    render(<Toast message="Default message" />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-blue-500');
  });

  it('has proper accessibility attributes', () => {
    render(<Toast message="Accessible toast" type="info" />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('is positioned fixed at bottom-right', () => {
    const { container } = render(
      <Toast message="Position test" type="success" />
    );

    const toast = container.querySelector('div[role="alert"]');
    expect(toast).toHaveClass('fixed', 'bottom-4', 'right-4');
  });

  it('has shadow and rounded corners', () => {
    const { container } = render(
      <Toast message="Style test" type="success" />
    );

    const toast = container.querySelector('div[role="alert"]');
    expect(toast).toHaveClass('rounded-lg', 'shadow-lg');
  });

  it('displays message text correctly', () => {
    const message = 'This is a test message';
    render(<Toast message={message} type="success" />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('renders with white text color', () => {
    const { container } = render(
      <Toast message="Color test" type="success" />
    );

    const toast = container.querySelector('div[role="alert"]');
    expect(toast).toHaveClass('text-white');
  });

  it('renders with padding and gap', () => {
    const { container } = render(
      <Toast message="Spacing test" type="success" />
    );

    const toast = container.querySelector('div[role="alert"]');
    expect(toast).toHaveClass('px-6', 'py-3');
  });
});
