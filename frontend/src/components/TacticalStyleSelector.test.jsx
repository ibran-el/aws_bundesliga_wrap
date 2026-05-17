import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TacticalStyleSelector } from './TacticalStyleSelector'

describe('TacticalStyleSelector Component', () => {
  it('renders with label and dropdown', () => {
    const mockOnChange = vi.fn()
    render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    expect(screen.getByLabelText('Tactical style preference')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('displays all three tactical style options', () => {
    const mockOnChange = vi.fn()
    render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    expect(screen.getByRole('option', { name: 'High Press' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Possession' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Counter-Attack' })).toBeInTheDocument()
  })

  it('displays the current selected value', () => {
    const mockOnChange = vi.fn()
    render(<TacticalStyleSelector value="Possession" onChange={mockOnChange} />)
    
    const select = screen.getByRole('combobox')
    expect(select.value).toBe('Possession')
  })

  it('calls onChange when user selects a different option', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'Counter-Attack')
    
    expect(mockOnChange).toHaveBeenCalledWith('Counter-Attack')
  })

  it('updates selected value when prop changes', () => {
    const mockOnChange = vi.fn()
    const { rerender } = render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    expect(screen.getByRole('combobox').value).toBe('High Press')
    
    rerender(<TacticalStyleSelector value="Possession" onChange={mockOnChange} />)
    expect(screen.getByRole('combobox').value).toBe('Possession')
  })

  it('has proper accessibility attributes', () => {
    const mockOnChange = vi.fn()
    render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('id', 'tactical-style-select')
    expect(select).toHaveAttribute('aria-label', 'Tactical style preference')
  })

  it('label is associated with select via htmlFor', () => {
    const mockOnChange = vi.fn()
    render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    const label = screen.getByText('Tactical Style')
    expect(label).toHaveAttribute('for', 'tactical-style-select')
  })

  it('displays helper text', () => {
    const mockOnChange = vi.fn()
    render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    expect(screen.getByText('Choose your preferred tactical approach')).toBeInTheDocument()
  })

  it('handles all three tactical styles', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const { rerender } = render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    const select = screen.getByRole('combobox')
    
    // Test High Press
    expect(select.value).toBe('High Press')
    
    // Test Possession
    await user.selectOptions(select, 'Possession')
    expect(mockOnChange).toHaveBeenCalledWith('Possession')
    rerender(<TacticalStyleSelector value="Possession" onChange={mockOnChange} />)
    expect(select.value).toBe('Possession')
    
    // Test Counter-Attack
    await user.selectOptions(select, 'Counter-Attack')
    expect(mockOnChange).toHaveBeenCalledWith('Counter-Attack')
    rerender(<TacticalStyleSelector value="Counter-Attack" onChange={mockOnChange} />)
    expect(select.value).toBe('Counter-Attack')
  })

  it('has focus ring styling for accessibility', () => {
    const mockOnChange = vi.fn()
    render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    const select = screen.getByRole('combobox')
    expect(select).toHaveClass('focus:ring-2', 'focus:ring-blue-500')
  })

  it('has white background for better visibility', () => {
    const mockOnChange = vi.fn()
    render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    const select = screen.getByRole('combobox')
    expect(select).toHaveClass('bg-white')
  })

  it('is keyboard navigable', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    const select = screen.getByRole('combobox')
    
    // Focus the select
    select.focus()
    expect(select).toHaveFocus()
    
    // Use arrow keys to navigate (browser handles this)
    await user.keyboard('{ArrowDown}')
    // The onChange should be called when selection changes
  })

  it('maintains value when component re-renders', () => {
    const mockOnChange = vi.fn()
    const { rerender } = render(<TacticalStyleSelector value="Counter-Attack" onChange={mockOnChange} />)
    
    expect(screen.getByRole('combobox').value).toBe('Counter-Attack')
    
    // Re-render with same value
    rerender(<TacticalStyleSelector value="Counter-Attack" onChange={mockOnChange} />)
    expect(screen.getByRole('combobox').value).toBe('Counter-Attack')
  })

  it('renders options in correct order', () => {
    const mockOnChange = vi.fn()
    render(<TacticalStyleSelector value="High Press" onChange={mockOnChange} />)
    
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0].textContent).toBe('High Press')
    expect(options[1].textContent).toBe('Possession')
    expect(options[2].textContent).toBe('Counter-Attack')
  })
})
