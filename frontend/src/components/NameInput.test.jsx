import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NameInput } from './NameInput'

describe('NameInput Component', () => {
  it('renders with label and placeholder', () => {
    const mockOnChange = vi.fn()
    render(<NameInput value="" onChange={mockOnChange} />)
    
    expect(screen.getByLabelText('Your name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
  })

  it('displays the current value', () => {
    const mockOnChange = vi.fn()
    render(<NameInput value="John Doe" onChange={mockOnChange} />)
    
    const input = screen.getByDisplayValue('John Doe')
    expect(input).toBeInTheDocument()
  })

  it('calls onChange when user types', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<NameInput value="" onChange={mockOnChange} />)
    
    const input = screen.getByPlaceholderText('Enter your name')
    await user.type(input, 'A')
    
    expect(mockOnChange).toHaveBeenCalledWith('A')
  })

  it('enforces max length of 50 characters', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<NameInput value="" onChange={mockOnChange} />)
    
    const input = screen.getByPlaceholderText('Enter your name')
    const longName = 'a'.repeat(60)
    await user.type(input, longName)
    
    expect(input.maxLength).toBe(50)
  })

  it('displays character count', () => {
    const mockOnChange = vi.fn()
    render(<NameInput value="Test" onChange={mockOnChange} />)
    
    expect(screen.getByText('4/50 characters')).toBeInTheDocument()
  })

  it('updates character count when value changes', () => {
    const mockOnChange = vi.fn()
    const { rerender } = render(<NameInput value="Test" onChange={mockOnChange} />)
    
    expect(screen.getByText('4/50 characters')).toBeInTheDocument()
    
    rerender(<NameInput value="Testing" onChange={mockOnChange} />)
    expect(screen.getByText('7/50 characters')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    const mockOnChange = vi.fn()
    render(<NameInput value="" onChange={mockOnChange} />)
    
    const input = screen.getByPlaceholderText('Enter your name')
    expect(input).toHaveAttribute('id', 'name-input')
    expect(input).toHaveAttribute('aria-label', 'Your name')
    expect(input).toHaveAttribute('type', 'text')
  })

  it('label is associated with input via htmlFor', () => {
    const mockOnChange = vi.fn()
    render(<NameInput value="" onChange={mockOnChange} />)
    
    const label = screen.getByText('Your Name')
    expect(label).toHaveAttribute('for', 'name-input')
  })

  it('handles empty value', () => {
    const mockOnChange = vi.fn()
    render(<NameInput value="" onChange={mockOnChange} />)
    
    expect(screen.getByDisplayValue('')).toBeInTheDocument()
    expect(screen.getByText('0/50 characters')).toBeInTheDocument()
  })

  it('is a controlled component', () => {
    const mockOnChange = vi.fn()
    const { rerender } = render(<NameInput value="Initial" onChange={mockOnChange} />)
    
    expect(screen.getByDisplayValue('Initial')).toBeInTheDocument()
    
    rerender(<NameInput value="Updated" onChange={mockOnChange} />)
    expect(screen.getByDisplayValue('Updated')).toBeInTheDocument()
  })

  it('has focus ring styling for accessibility', () => {
    const mockOnChange = vi.fn()
    render(<NameInput value="" onChange={mockOnChange} />)
    
    const input = screen.getByPlaceholderText('Enter your name')
    expect(input).toHaveClass('focus:ring-2', 'focus:ring-blue-500')
  })

  it('handles max length correctly', () => {
    const mockOnChange = vi.fn()
    const maxLengthString = 'a'.repeat(50)
    render(<NameInput value={maxLengthString} onChange={mockOnChange} />)
    
    expect(screen.getByText('50/50 characters')).toBeInTheDocument()
  })
})
