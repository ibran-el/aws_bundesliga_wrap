import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JudgeInputForm } from './JudgeInputForm'

describe('JudgeInputForm Component', () => {
  const mockClub = {
    club_id: 'FCB',
    name: 'FC Bayern Munich',
    short_name: 'Bayern',
    three_letter_code: 'FCB',
    primary_color: '#DC052D',
    secondary_color: '#FFFFFF',
  }

  const defaultProps = {
    selectedClub: mockClub,
    userName: '',
    onUserNameChange: vi.fn(),
    tacticalStyle: 'High Press',
    onTacticalStyleChange: vi.fn(),
    onGenerateWrapped: vi.fn(),
    loading: false,
    onChangeClub: vi.fn(),
  }

  describe('Rendering', () => {
    it('renders the form title and subtitle', () => {
      render(<JudgeInputForm {...defaultProps} />)
      
      expect(screen.getByText('Create Your Wrapped')).toBeInTheDocument()
      expect(screen.getByText('Enter your details to generate a personalized season recap')).toBeInTheDocument()
    })

    it('displays the selected club with its colors', () => {
      render(<JudgeInputForm {...defaultProps} />)
      
      expect(screen.getByText('FC Bayern Munich')).toBeInTheDocument()
      expect(screen.getByText('Bayern • FCB')).toBeInTheDocument()
    })

    it('renders the NameInput component', () => {
      render(<JudgeInputForm {...defaultProps} />)
      
      expect(screen.getByLabelText('Your name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
    })

    it('renders the TacticalStyleSelector component', () => {
      render(<JudgeInputForm {...defaultProps} />)
      
      expect(screen.getByLabelText('Tactical style preference')).toBeInTheDocument()
    })

    it('renders the Generate Wrapped button', () => {
      render(<JudgeInputForm {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /Generate wrapped card/i })).toBeInTheDocument()
    })

    it('renders a Change Club button', () => {
      render(<JudgeInputForm {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /Change club selection/i })).toBeInTheDocument()
    })

    it('displays placeholder message when no club is selected', () => {
      render(<JudgeInputForm {...defaultProps} selectedClub={null} />)
      
      expect(screen.getByText('Please select a club first')).toBeInTheDocument()
    })
  })

  describe('Button State', () => {
    it('disables Generate button when name is empty', () => {
      render(<JudgeInputForm {...defaultProps} userName="" />)
      
      const button = screen.getByRole('button', { name: /Generate wrapped card/i })
      expect(button).toBeDisabled()
    })

    it('disables Generate button when name is only whitespace', () => {
      render(<JudgeInputForm {...defaultProps} userName="   " />)
      
      const button = screen.getByRole('button', { name: /Generate wrapped card/i })
      expect(button).toBeDisabled()
    })

    it('disables Generate button when no club is selected', () => {
      render(<JudgeInputForm {...defaultProps} selectedClub={null} userName="John" />)
      
      const button = screen.getByRole('button', { name: /Generate wrapped card/i })
      expect(button).toBeDisabled()
    })

    it('disables Generate button when loading', () => {
      render(<JudgeInputForm {...defaultProps} userName="John" loading={true} />)
      
      expect(screen.getByText('Generating...')).toBeInTheDocument()
      const button = screen.getByRole('button', { name: /Generate wrapped card/i })
      expect(button).toBeDisabled()
    })

    it('enables Generate button when name is entered and club is selected', () => {
      render(<JudgeInputForm {...defaultProps} userName="John Doe" />)
      
      const button = screen.getByRole('button', { name: /Generate wrapped card/i })
      expect(button).not.toBeDisabled()
    })

    it('shows loading state with spinner and "Generating..." text', () => {
      render(<JudgeInputForm {...defaultProps} userName="John" loading={true} />)
      
      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onUserNameChange when user types in name input', async () => {
      const user = userEvent.setup()
      const mockOnChange = vi.fn()
      
      render(
        <JudgeInputForm
          {...defaultProps}
          onUserNameChange={mockOnChange}
        />
      )
      
      const input = screen.getByPlaceholderText('Enter your name')
      await user.type(input, 'A')
      
      expect(mockOnChange).toHaveBeenCalledWith('A')
    })

    it('calls onTacticalStyleChange when user selects a style', async () => {
      const user = userEvent.setup()
      const mockOnChange = vi.fn()
      
      render(
        <JudgeInputForm
          {...defaultProps}
          onTacticalStyleChange={mockOnChange}
        />
      )
      
      const select = screen.getByLabelText('Tactical style preference')
      await user.selectOptions(select, 'Possession')
      
      expect(mockOnChange).toHaveBeenCalledWith('Possession')
    })

    it('calls onChangeClub when Change button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnChangeClub = vi.fn()
      
      render(
        <JudgeInputForm
          {...defaultProps}
          onChangeClub={mockOnChangeClub}
        />
      )
      
      const changeButton = screen.getByRole('button', { name: /Change club selection/i })
      await user.click(changeButton)
      
      expect(mockOnChangeClub).toHaveBeenCalled()
    })

    it('calls onGenerateWrapped with name and tactical style when form is submitted', async () => {
      const user = userEvent.setup()
      const mockOnGenerateWrapped = vi.fn()
      
      render(
        <JudgeInputForm
          {...defaultProps}
          userName="John Doe"
          tacticalStyle="Possession"
          onGenerateWrapped={mockOnGenerateWrapped}
        />
      )
      
      const button = screen.getByRole('button', { name: /Generate wrapped card/i })
      await user.click(button)
      
      expect(mockOnGenerateWrapped).toHaveBeenCalledWith('John Doe', 'Possession')
    })

    it('prevents form submission when button is disabled', async () => {
      const user = userEvent.setup()
      const mockOnGenerateWrapped = vi.fn()
      
      render(
        <JudgeInputForm
          {...defaultProps}
          userName=""
          onGenerateWrapped={mockOnGenerateWrapped}
        />
      )
      
      const button = screen.getByRole('button', { name: /Generate wrapped card/i })
      await user.click(button)
      
      expect(mockOnGenerateWrapped).not.toHaveBeenCalled()
    })
  })

  describe('Helper Text', () => {
    it('shows "Enter your name to continue" when name is empty but club is selected', () => {
      render(<JudgeInputForm {...defaultProps} userName="" />)
      
      expect(screen.getByText('Enter your name to continue')).toBeInTheDocument()
    })

    it('shows "Select a club to continue" when club is not selected', () => {
      render(<JudgeInputForm {...defaultProps} selectedClub={null} userName="John" />)
      
      expect(screen.getByText('Select a club to continue')).toBeInTheDocument()
    })

    it('shows "Ready to generate..." when both name and club are provided', () => {
      render(<JudgeInputForm {...defaultProps} userName="John Doe" />)
      
      expect(screen.getByText('Ready to generate your personalized Wrapped card')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper form structure with submit button', () => {
      render(<JudgeInputForm {...defaultProps} userName="John" />)
      
      const form = screen.getByRole('button', { name: /Generate wrapped card/i }).closest('form')
      expect(form).toBeInTheDocument()
    })

    it('has aria-label on Generate button', () => {
      render(<JudgeInputForm {...defaultProps} userName="John" />)
      
      const button = screen.getByRole('button', { name: /Generate wrapped card/i })
      expect(button).toHaveAttribute('aria-label', 'Generate wrapped card')
    })

    it('has aria-label on Change Club button', () => {
      render(<JudgeInputForm {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /Change club selection/i })
      expect(button).toHaveAttribute('aria-label', 'Change club selection')
    })

    it('displays club information in a visually distinct section', () => {
      const { container } = render(<JudgeInputForm {...defaultProps} />)
      
      const clubSection = container.querySelector('[style*="background-color"]')
      expect(clubSection).toBeInTheDocument()
      expect(clubSection).toHaveClass('rounded-lg')
      expect(clubSection).toHaveClass('shadow-md')
    })
  })

  describe('Club Display Styling', () => {
    it('applies club primary color as background', () => {
      const { container } = render(<JudgeInputForm {...defaultProps} />)
      
      const clubSection = container.querySelector('[style*="background-color"]')
      expect(clubSection).toHaveStyle(`background-color: ${mockClub.primary_color}`)
    })

    it('applies club secondary color to text', () => {
      render(<JudgeInputForm {...defaultProps} />)
      
      const clubName = screen.getByText('FC Bayern Munich')
      expect(clubName).toHaveStyle(`color: ${mockClub.secondary_color}`)
    })
  })

  describe('Form Submission', () => {
    it('handles form submission via Enter key', async () => {
      const user = userEvent.setup()
      const mockOnGenerateWrapped = vi.fn()
      
      render(
        <JudgeInputForm
          {...defaultProps}
          userName="John Doe"
          onGenerateWrapped={mockOnGenerateWrapped}
        />
      )
      
      const input = screen.getByPlaceholderText('Enter your name')
      await user.click(input)
      await user.keyboard('{Enter}')
      
      expect(mockOnGenerateWrapped).toHaveBeenCalledWith('John Doe', 'High Press')
    })

    it('passes correct tactical style to callback', async () => {
      const user = userEvent.setup()
      const mockOnGenerateWrapped = vi.fn()
      
      render(
        <JudgeInputForm
          {...defaultProps}
          userName="Jane Smith"
          tacticalStyle="Counter-Attack"
          onGenerateWrapped={mockOnGenerateWrapped}
        />
      )
      
      const button = screen.getByRole('button', { name: /Generate wrapped card/i })
      await user.click(button)
      
      expect(mockOnGenerateWrapped).toHaveBeenCalledWith('Jane Smith', 'Counter-Attack')
    })
  })

  describe('Edge Cases', () => {
    it('handles club with special characters in name', () => {
      const specialClub = {
        ...mockClub,
        name: 'Borussia Mönchengladbach',
        short_name: 'Gladbach',
      }
      
      render(<JudgeInputForm {...defaultProps} selectedClub={specialClub} />)
      
      expect(screen.getByText('Borussia Mönchengladbach')).toBeInTheDocument()
    })

    it('handles very long user names', () => {
      const longName = 'A'.repeat(50)
      render(<JudgeInputForm {...defaultProps} userName={longName} />)
      
      const button = screen.getByRole('button', { name: /Generate wrapped card/i })
      expect(button).not.toBeDisabled()
    })

    it('handles all tactical style options', () => {
      const { rerender } = render(
        <JudgeInputForm {...defaultProps} userName="John" tacticalStyle="High Press" />
      )
      
      let button = screen.getByRole('button', { name: /Generate wrapped card/i })
      expect(button).not.toBeDisabled()
      
      rerender(
        <JudgeInputForm {...defaultProps} userName="John" tacticalStyle="Possession" />
      )
      button = screen.getByRole('button', { name: /Generate wrapped card/i })
      expect(button).not.toBeDisabled()
      
      rerender(
        <JudgeInputForm {...defaultProps} userName="John" tacticalStyle="Counter-Attack" />
      )
      button = screen.getByRole('button', { name: /Generate wrapped card/i })
      expect(button).not.toBeDisabled()
    })
  })
})
