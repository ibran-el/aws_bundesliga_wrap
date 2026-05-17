# Accessibility Quick Reference — Bundesliga Wrapped Frontend

**Purpose:** Quick reference guide for developers maintaining accessibility standards
**Audience:** Frontend developers
**Last Updated:** 2024

---

## Accessibility Checklist for New Components

When creating new components, ensure they meet these accessibility requirements:

### Keyboard Navigation
- [ ] All interactive elements are focusable via Tab
- [ ] Focus ring is visible (use `focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`)
- [ ] Tab order is logical (left-to-right, top-to-bottom)
- [ ] No focus traps (user can always Tab out)
- [ ] Enter key activates buttons and submits forms

### Form Elements
- [ ] All inputs have associated `<label>` with `htmlFor` attribute
- [ ] All inputs have `aria-label` for additional context
- [ ] Form validation errors are announced
- [ ] Helper text is provided for complex fields

### Screen Reader
- [ ] All text is semantic and meaningful
- [ ] Buttons have descriptive text (not just icons)
- [ ] Headings use proper hierarchy (`<h1>`, `<h2>`, `<h3>`)
- [ ] ARIA attributes are used correctly (not overused)
- [ ] Dynamic content uses `aria-live` for announcements

### Color and Contrast
- [ ] Text has contrast ratio of at least 4.5:1
- [ ] Color is not the only means of conveying information
- [ ] Icons have text labels or `aria-label`
- [ ] Disabled state is conveyed through multiple means

### Responsive
- [ ] Touch targets are at least 44px on mobile
- [ ] Focus ring is visible on all breakpoints
- [ ] No horizontal scrolling on any breakpoint
- [ ] Text is readable without zoom

---

## Common Patterns

### Form Input with Label
```jsx
export function TextInput({ id, label, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
        aria-label={label}
      />
    </div>
  )
}
```

### Dropdown with Label
```jsx
export function Select({ id, label, value, onChange, options }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
```

### Button with Focus Ring
```jsx
export function Button({ onClick, children, disabled = false, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-6 py-3 rounded-lg font-semibold transition-colors
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${disabled
          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }
      `}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}
```

### Error Toast with Alert Role
```jsx
export function ErrorToast({ message, onRetry, onDismiss }) {
  return (
    <div
      className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg"
      role="alert"
      aria-live="assertive"
    >
      <p className="mb-3">{message}</p>
      <div className="flex gap-2">
        <button onClick={onRetry} aria-label="Retry the failed operation">
          Retry
        </button>
        <button onClick={onDismiss} aria-label="Dismiss the error message">
          Dismiss
        </button>
      </div>
    </div>
  )
}
```

### Loading Spinner with Live Region
```jsx
export function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-12"
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  )
}
```

### Selectable Card with aria-pressed
```jsx
export function SelectableCard({ player, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 rounded-lg border-2 transition-all text-left
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isSelected
          ? 'border-blue-600 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
      aria-pressed={isSelected}
      aria-label={`${player.name}, shirt number ${player.shirt_number}, position ${player.playing_position}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
          {player.shirt_number}
        </div>
        <div className="flex-grow">
          <p className="font-semibold text-gray-900">{player.name}</p>
          <p className="text-sm text-gray-600">{player.playing_position}</p>
        </div>
        {isSelected && (
          <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </button>
  )
}
```

---

## ARIA Attributes Reference

### Common ARIA Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `aria-label` | Provides accessible name | `<button aria-label="Close menu">×</button>` |
| `aria-labelledby` | Links element to label | `<h2 id="title">Title</h2><div aria-labelledby="title">` |
| `aria-describedby` | Links element to description | `<input aria-describedby="hint"><p id="hint">Hint text</p>` |
| `aria-live` | Announces dynamic content | `<div aria-live="polite">Loading...</div>` |
| `aria-pressed` | Indicates toggle button state | `<button aria-pressed="true">Active</button>` |
| `aria-expanded` | Indicates if element is expanded | `<button aria-expanded="false">Menu</button>` |
| `aria-hidden` | Hides element from screen readers | `<div aria-hidden="true">Decorative icon</div>` |
| `role` | Defines element role | `<div role="alert">Error message</div>` |

### aria-live Values

| Value | Purpose | Example |
|-------|---------|---------|
| `polite` | Announces when user is idle | Loading states, form validation |
| `assertive` | Announces immediately | Error messages, urgent alerts |
| `off` | No announcement (default) | Decorative content |

### Common Roles

| Role | Purpose | Example |
|------|---------|---------|
| `alert` | Error or warning message | `<div role="alert">Error occurred</div>` |
| `status` | Status message | `<div role="status">Saved successfully</div>` |
| `button` | Clickable element | `<div role="button">Click me</div>` |
| `navigation` | Navigation section | `<nav role="navigation">` |
| `main` | Main content | `<main role="main">` |

---

## Tailwind CSS Accessibility Classes

### Focus Ring
```css
focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
```

### Disabled State
```css
disabled:opacity-50 disabled:cursor-not-allowed
```

### Hover State
```css
hover:bg-blue-700 active:bg-blue-800
```

### Responsive Text
```css
text-sm md:text-base lg:text-lg
```

### Touch Target (44px minimum)
```css
px-4 py-3 /* Approximately 44px height */
```

---

## Testing Commands

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Specific Test File
```bash
npm test -- ClubSelector.test.jsx
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

---

## Browser DevTools Tips

### Chrome DevTools
1. Press **F12** to open DevTools
2. Go to **Lighthouse** tab
3. Select **Accessibility**
4. Click **Analyze page load**
5. Review accessibility score and issues

### Firefox DevTools
1. Press **F12** to open DevTools
2. Go to **Inspector** tab
3. Right-click element and select **Inspect Accessibility Properties**
4. Review accessibility tree

### Safari DevTools
1. Press **Cmd+Option+I** to open DevTools
2. Go to **Elements** tab
3. Right-click element and select **Inspect Element**
4. Review HTML structure

---

## Screen Reader Testing

### NVDA (Windows)
1. Download from https://www.nvaccess.org/
2. Install and start NVDA
3. Press **Ctrl+Alt+N** to start
4. Use **Tab** to navigate
5. Press **Ins+Space** to open menu

### JAWS (Windows)
1. Download from https://www.freedomscientific.com/
2. Install and start JAWS
3. Use **Tab** to navigate
4. Press **Ins+H** for help

### VoiceOver (macOS)
1. Press **Cmd+F5** to enable
2. Use **Tab** to navigate
3. Press **Ctrl+Option+U** to open rotor

---

## Common Accessibility Issues and Fixes

### Issue: Focus ring not visible
**Fix:** Ensure CSS doesn't have `outline: none` without replacement focus style
```css
/* Bad */
button { outline: none; }

/* Good */
button { 
  outline: none;
  focus:ring-2 focus:ring-offset-2 focus:ring-blue-500;
}
```

### Issue: Form label not announced
**Fix:** Use `<label htmlFor>` instead of placeholder-only
```jsx
/* Bad */
<input placeholder="Name" />

/* Good */
<label htmlFor="name">Name</label>
<input id="name" />
```

### Issue: Button text not descriptive
**Fix:** Use descriptive text or aria-label
```jsx
/* Bad */
<button>×</button>

/* Good */
<button aria-label="Close menu">×</button>
```

### Issue: Color only means of conveying information
**Fix:** Add text, icons, or other visual indicators
```jsx
/* Bad */
<div style={{ backgroundColor: synergy > 0 ? 'green' : 'red' }} />

/* Good */
<div style={{ backgroundColor: synergy > 0 ? 'green' : 'red' }}>
  <span>{synergy > 0 ? '+' : ''}{synergy}</span>
</div>
```

### Issue: Focus trap in modal
**Fix:** Manage focus when modal opens/closes
```jsx
useEffect(() => {
  if (isOpen) {
    // Focus first focusable element in modal
    firstFocusableElement.focus();
  } else {
    // Restore focus to trigger element
    triggerElement.focus();
  }
}, [isOpen]);
```

---

## Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WAVE](https://wave.webaim.org/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Screen Readers
- [NVDA](https://www.nvaccess.org/)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver](https://www.apple.com/accessibility/voiceover/)

---

## Accessibility Standards

### WCAG 2.1 Levels
- **Level A:** Basic accessibility
- **Level AA:** Enhanced accessibility (recommended)
- **Level AAA:** Advanced accessibility

### Bundesliga Wrapped Target
- **Target Level:** WCAG 2.1 AA
- **Current Status:** ✅ Compliant

---

## Maintenance Checklist

### Before Deploying
- [ ] Run `npm test` - all tests pass
- [ ] Run Lighthouse accessibility audit - score 90+
- [ ] Test keyboard navigation - all elements focusable
- [ ] Test with screen reader - all content announced
- [ ] Check color contrast - all text 4.5:1 minimum
- [ ] Test on mobile, tablet, desktop - all accessible

### When Adding New Features
- [ ] Add keyboard navigation support
- [ ] Add focus ring styling
- [ ] Add form labels with `htmlFor`
- [ ] Add ARIA attributes if needed
- [ ] Add screen reader testing
- [ ] Add unit tests for accessibility

### When Fixing Bugs
- [ ] Verify fix doesn't break accessibility
- [ ] Test keyboard navigation still works
- [ ] Test screen reader still announces content
- [ ] Run Lighthouse audit to verify score

---

## Contact and Support

For accessibility questions or issues:
1. Check this quick reference guide
2. Review the full testing guide: `ACCESSIBILITY_TESTING_GUIDE.md`
3. Review the test report: `ACCESSIBILITY_TEST_REPORT.md`
4. Consult WCAG 2.1 guidelines: https://www.w3.org/WAI/WCAG21/quickref/

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial version - WCAG 2.1 AA compliant |

