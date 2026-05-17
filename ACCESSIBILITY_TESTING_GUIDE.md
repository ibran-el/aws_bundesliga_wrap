# Accessibility Testing Guide — Bundesliga Wrapped Frontend

**Purpose:** Manual testing procedures for verifying WCAG 2.1 AA compliance
**Target Audience:** QA testers, accessibility auditors, developers
**Last Updated:** 2024

---

## Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Screen reader (NVDA for Windows, JAWS for Windows, VoiceOver for macOS)
- Keyboard (no mouse)
- Optional: axe DevTools browser extension

### Test Environment
- **URL:** https://[amplify-url] (or localhost:3000 for local testing)
- **Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Screen Readers:** NVDA, JAWS, VoiceOver

---

## Test 1: Keyboard Navigation

### Objective
Verify all interactive elements are accessible via keyboard only (no mouse).

### Procedure

#### 1.1 Landing Page - Club Selection
1. Open the app in a browser
2. Press **Tab** to focus the first club card
3. Verify: Blue focus ring appears around the club card
4. Press **Tab** repeatedly to cycle through all 18 clubs
5. Verify: Focus ring moves left-to-right, top-to-bottom
6. Press **Shift+Tab** to cycle backwards
7. Verify: Focus ring moves in reverse order
8. Focus any club card and press **Enter**
9. Verify: Club is selected and app navigates to Judge Input Form

**Expected Result:** ✅ All clubs are focusable, focus ring is visible, Enter selects club

---

#### 1.2 Judge Input Form
1. Tab to the "Change" button (to change club)
2. Verify: Focus ring visible
3. Press **Enter** to activate
4. Verify: App returns to club selection
5. Select a club again
6. Tab to the "Your Name" input field
7. Verify: Focus ring visible around input
8. Type your name (e.g., "John")
9. Tab to the "Tactical Style" dropdown
10. Verify: Focus ring visible around dropdown
11. Press **Down Arrow** to open dropdown
12. Press **Down Arrow** to select next option
13. Press **Enter** to confirm selection
14. Tab to the "Generate My Wrapped" button
15. Verify: Button is enabled (not grayed out)
16. Press **Enter** to submit form

**Expected Result:** ✅ All form fields are focusable, focus ring is visible, form submits with Enter

---

#### 1.3 Wrapped Card View
1. Wait for Wrapped Card to load
2. Tab to the "Share" button
3. Verify: Focus ring visible
4. Press **Enter** to copy share text
5. Verify: Toast notification appears
6. Tab to the "Next" button
7. Verify: Focus ring visible
8. Press **Enter** to navigate to MVP Leaderboard

**Expected Result:** ✅ All buttons are focusable, focus ring is visible, buttons activate with Enter

---

#### 1.4 MVP Leaderboard
1. Tab to the "Try Manager Mode" button
2. Verify: Focus ring visible
3. Press **Enter** to navigate to Substitution Simulator

**Expected Result:** ✅ Button is focusable, focus ring is visible, button activates with Enter

---

#### 1.5 Substitution Simulator - Match Picker
1. Tab to the "Select a Match" dropdown
2. Verify: Focus ring visible
3. Press **Down Arrow** to open dropdown
4. Press **Down Arrow** to select first match
5. Press **Enter** to confirm selection
6. Verify: Bench Selector appears

**Expected Result:** ✅ Dropdown is focusable, focus ring is visible, arrow keys navigate options

---

#### 1.6 Substitution Simulator - Bench Selector
1. Tab to the first player card in Starting XI
2. Verify: Focus ring visible
3. Press **Enter** to select player
4. Verify: Player card is highlighted (blue background)
5. Tab to a player card in Bench
6. Verify: Focus ring visible
7. Press **Enter** to select player
8. Verify: Player card is highlighted
9. Tab to the "Analyze Substitution" button
10. Verify: Button is enabled (not grayed out)
11. Press **Enter** to submit

**Expected Result:** ✅ All player cards are focusable, focus ring is visible, Enter selects player

---

#### 1.7 Tactical Analysis Card
1. Tab to the "Try Another Match" button
2. Verify: Focus ring visible
3. Press **Enter** to reset simulator

**Expected Result:** ✅ Button is focusable, focus ring is visible, button activates with Enter

---

### Summary
- ✅ All interactive elements are focusable via Tab
- ✅ Focus ring is visible on all focused elements
- ✅ Tab order is logical (left-to-right, top-to-bottom)
- ✅ No focus traps (can always Tab out)
- ✅ Enter key activates buttons and submits forms

---

## Test 2: Focus Ring Visibility

### Objective
Verify focus ring is visible and meets WCAG AA standards.

### Procedure

1. Open the app in a browser
2. Press **Tab** to focus the first interactive element
3. Observe the focus ring around the element
4. Verify the following:
   - **Color:** Blue (#2563EB)
   - **Width:** 2px
   - **Offset:** 2px (clear separation from element)
   - **Contrast:** Visible against background
   - **Shape:** Rounded rectangle matching element shape

### Expected Result
- ✅ Focus ring is visible on all interactive elements
- ✅ Focus ring color is consistent (blue)
- ✅ Focus ring has sufficient contrast
- ✅ Focus ring is not obscured by other elements

---

## Test 3: Form Label Association

### Objective
Verify form labels are properly associated with inputs via `htmlFor` attribute.

### Procedure

#### 3.1 Using Browser DevTools
1. Open the app in Chrome/Firefox
2. Press **F12** to open DevTools
3. Navigate to Judge Input Form
4. Right-click on the "Your Name" input
5. Select "Inspect" or "Inspect Element"
6. In the HTML, verify:
   ```html
   <label htmlFor="name-input">Your Name</label>
   <input id="name-input" type="text" ... />
   ```
7. Verify the `htmlFor` attribute matches the input `id`
8. Repeat for "Tactical Style" dropdown:
   ```html
   <label htmlFor="tactical-style-select">Tactical Style</label>
   <select id="tactical-style-select" ... />
   ```
9. Repeat for "Select a Match" dropdown:
   ```html
   <label htmlFor="match-picker">Select a Match</label>
   <select id="match-picker" ... />
   ```

#### 3.2 Using Screen Reader (NVDA)
1. Open the app in Firefox
2. Start NVDA (Ctrl+Alt+N)
3. Navigate to Judge Input Form
4. Press **Tab** to focus the "Your Name" input
5. Verify NVDA announces: "Your Name, edit text"
6. Press **Tab** to focus the "Tactical Style" dropdown
7. Verify NVDA announces: "Tactical Style, combo box"
8. Navigate to Substitution Simulator
9. Press **Tab** to focus the "Select a Match" dropdown
10. Verify NVDA announces: "Select a Match, combo box"

### Expected Result
- ✅ All form labels have `htmlFor` attribute
- ✅ `htmlFor` attribute matches input `id`
- ✅ Screen reader announces label with input

---

## Test 4: Screen Reader Announcements

### Objective
Verify screen reader announces all text, buttons, and form labels correctly.

### Procedure

#### 4.1 Setup NVDA (Windows)
1. Download and install NVDA from https://www.nvaccess.org/
2. Open the app in Firefox
3. Start NVDA (Ctrl+Alt+N)
4. Enable "Focus Mode" (Ins+Space, then F)

#### 4.2 Landing Page
1. Press **Home** to go to top of page
2. Verify NVDA announces:
   - "Bundesliga Wrapped, heading level 1"
   - "The Manager's Wrapped: From Passive Fan to Tactical Coach"
   - "Select Your Club, heading level 2"
   - Each club name and code
3. Press **Tab** to focus first club
4. Verify NVDA announces: "[Club Name], button"

#### 4.3 Judge Input Form
1. Navigate to Judge Input Form
2. Verify NVDA announces:
   - "Create Your Wrapped, heading level 1"
   - "Selected Club, [Club Name]"
   - "Your Name, edit text"
   - "Tactical Style, combo box"
   - "Generate My Wrapped, button"
3. Focus the "Your Name" input
4. Verify NVDA announces: "Your Name, edit text, blank"
5. Type your name
6. Verify NVDA announces: "[Your Name], edit text"

#### 4.4 Wrapped Card View
1. Navigate to Wrapped Card View
2. Verify NVDA announces:
   - "Your Bundesliga Wrapped 2024–25, heading level 1"
   - "[Your Name] • [Club Name]"
   - "Your Season Story, heading level 2"
   - All narrative text
   - "Share, button"
   - "Next, button"

#### 4.5 MVP Leaderboard
1. Navigate to MVP Leaderboard
2. Verify NVDA announces:
   - "Season MVP — Data-Driven Ranking, heading level 2"
   - Each player card with rank, name, stats
   - Scout report text
   - "Try Manager Mode, button"

#### 4.6 Substitution Simulator
1. Navigate to Substitution Simulator
2. Verify NVDA announces:
   - "Manager Mode — Tactical Substitution Simulator, heading level 2"
   - "Select a Match, combo box"
   - "Match Information, heading level 2"
   - Match details (day, opponent, result, formation)
   - "Starting XI, heading level 3"
   - Each player card with name, shirt number, position
   - "Bench Players, heading level 3"
   - Each bench player card
   - "Analyze Substitution, button"

#### 4.7 Tactical Analysis Card
1. Navigate to Tactical Analysis Card
2. Verify NVDA announces:
   - "Tactical Analysis, heading level 2"
   - "Out: [Player Name] ([Position])"
   - "In: [Player Name] ([Position])"
   - "Synergy Score, +5.0" (numeric value)
   - "Strong Synergy" (interpretation label)
   - All analysis fields: Verdict, Risk, Manager Rating, Real-Time Note
   - "Try Another Match, button"

### Expected Result
- ✅ All text is announced correctly
- ✅ All buttons are announced as buttons
- ✅ All form labels are announced with inputs
- ✅ All headings are announced with level
- ✅ Dynamic content is announced when it appears

---

## Test 5: Color Contrast

### Objective
Verify all text and interactive elements meet WCAG AA color contrast minimum (4.5:1 for normal text, 3:1 for large text).

### Procedure

#### 5.1 Using WebAIM Contrast Checker
1. Open WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
2. For each component, measure contrast:

**Judge Input Form:**
- Label text (#374151) on white background (#FFFFFF): 8.59:1 ✅
- Button text (#FFFFFF) on blue background (#2563EB): 4.54:1 ✅

**Wrapped Card:**
- Text color varies based on club color
- Verify contrast is at least 4.5:1 for all club colors

**Tactical Analysis Card:**
- Green label (#047857) on light green background (#DCFCE7): 5.21:1 ✅
- Red label (#991B1B) on light red background (#FEE2E2): 5.18:1 ✅
- Gray label (#374151) on light gray background (#F3F4F6): 8.59:1 ✅

#### 5.2 Using Browser DevTools
1. Open Chrome DevTools (F12)
2. Right-click on any text element
3. Select "Inspect"
4. In the Styles panel, hover over the color property
5. A color picker will show the contrast ratio
6. Verify contrast is at least 4.5:1

### Expected Result
- ✅ All text has contrast ratio of at least 4.5:1
- ✅ All interactive elements have sufficient contrast
- ✅ Color is not the only means of conveying information

---

## Test 6: Color Not Only Means of Conveying Information

### Objective
Verify color is not the only way to convey information (e.g., synergy gauge has numeric value).

### Procedure

#### 6.1 Synergy Gauge
1. Navigate to Tactical Analysis Card
2. Observe the synergy gauge:
   - **Visual:** Colored bar (green for positive, red for negative, gray for neutral)
   - **Numeric Value:** "+5.0" displayed next to gauge
   - **Label:** "Strong Synergy" displayed below gauge
   - **Scale Markers:** "-10", "0", "+10" displayed on gauge
3. Verify that even if you ignore the color:
   - The numeric value (+5.0) tells you the synergy score
   - The label ("Strong Synergy") tells you the interpretation
   - The scale markers tell you the range

#### 6.2 Player Selection
1. Navigate to Bench Selector
2. Observe player selection:
   - **Visual:** Blue background for selected player
   - **Indicator:** Checkmark icon appears in selected player card
   - **Text:** "Selected Substitution" section shows selected players
3. Verify that even if you ignore the color:
   - The checkmark icon indicates selection
   - The text summary shows selected players

#### 6.3 Form Validation
1. Navigate to Judge Input Form
2. Observe the "Generate My Wrapped" button:
   - **Visual:** Gray background when disabled
   - **Text:** Button text is "Generate My Wrapped"
   - **State:** Button is not clickable when disabled
3. Verify that even if you ignore the color:
   - The button is not clickable (disabled state)
   - The text is clear about the action

### Expected Result
- ✅ Color is used as enhancement, not sole means of communication
- ✅ All information is conveyed through text, icons, or state
- ✅ Users with color blindness can understand all information

---

## Test 7: Responsive Accessibility

### Objective
Verify app is accessible on mobile, tablet, and desktop breakpoints.

### Procedure

#### 7.1 Mobile (390px - iPhone SE)
1. Open Chrome DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select "iPhone SE" (390px width)
4. Navigate through the app using keyboard only
5. Verify:
   - All interactive elements are focusable
   - Focus ring is visible
   - Text is readable without zoom
   - No horizontal scrolling
   - Touch targets are at least 44px

#### 7.2 Tablet (768px - iPad)
1. In Chrome DevTools, select "iPad" (768px width)
2. Navigate through the app using keyboard only
3. Verify:
   - All interactive elements are focusable
   - Focus ring is visible
   - Text is readable without zoom
   - No horizontal scrolling
   - Layout is appropriate for tablet

#### 7.3 Desktop (1024px+)
1. In Chrome DevTools, select "Desktop" (1024px+ width)
2. Navigate through the app using keyboard only
3. Verify:
   - All interactive elements are focusable
   - Focus ring is visible
   - Text is readable without zoom
   - No horizontal scrolling
   - Layout is appropriate for desktop

### Expected Result
- ✅ App is accessible on all breakpoints
- ✅ Keyboard navigation works on all breakpoints
- ✅ Focus ring is visible on all breakpoints
- ✅ No horizontal scrolling on any breakpoint

---

## Test 8: Error Handling

### Objective
Verify error messages are announced and recoverable.

### Procedure

#### 8.1 API Error Simulation
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Check "Offline" to simulate network failure
4. Navigate to Judge Input Form
5. Enter name and click "Generate My Wrapped"
6. Verify:
   - Error toast appears
   - Error message is announced by screen reader
   - "Retry" button is focusable
   - "Dismiss" button is focusable
7. Uncheck "Offline"
8. Click "Retry"
9. Verify:
   - API call is retried
   - Wrapped card is generated

### Expected Result
- ✅ Error messages are displayed
- ✅ Error messages are announced by screen reader
- ✅ Retry button is available and functional
- ✅ User can recover from error

---

## Test 9: Loading States

### Objective
Verify loading states are announced and don't trap focus.

### Procedure

#### 9.1 Loading Spinner
1. Navigate to Judge Input Form
2. Enter name and click "Generate My Wrapped"
3. Observe loading spinner
4. Verify:
   - Loading spinner is displayed
   - Loading message is announced by screen reader
   - Focus is not trapped
   - User can still navigate with Tab

### Expected Result
- ✅ Loading state is displayed
- ✅ Loading state is announced by screen reader
- ✅ Focus is not trapped during loading

---

## Test 10: Semantic HTML

### Objective
Verify semantic HTML structure is correct.

### Procedure

#### 10.1 Using Browser DevTools
1. Open Chrome DevTools (F12)
2. Go to Elements tab
3. Inspect the HTML structure
4. Verify:
   - Headings use `<h1>`, `<h2>`, `<h3>` tags (not `<div>`)
   - Form inputs use `<input>`, `<select>`, `<textarea>` tags
   - Buttons use `<button>` tags (not `<div>`)
   - Links use `<a>` tags (not `<button>`)
   - Form labels use `<label>` tags with `htmlFor` attribute
   - Sections use `<section>` tags for content organization

#### 10.2 Using axe DevTools
1. Install axe DevTools browser extension
2. Open the app in Chrome
3. Click axe DevTools icon
4. Click "Scan ALL of my page"
5. Review results:
   - No "Critical" issues
   - No "Serious" issues
   - Review "Moderate" and "Minor" issues

### Expected Result
- ✅ Semantic HTML is used correctly
- ✅ No critical or serious accessibility issues
- ✅ Heading hierarchy is correct
- ✅ Form elements are properly structured

---

## Test 11: Focus Management

### Objective
Verify focus is managed correctly when navigating between views.

### Procedure

#### 11.1 Focus Restoration
1. Navigate to Judge Input Form
2. Tab to the "Your Name" input
3. Click "Change" button to go back to club selection
4. Verify: Focus is on the "Change" button (or first club)
5. Select a club
6. Verify: Focus is on the Judge Input Form
7. Tab through form fields
8. Click "Generate My Wrapped"
9. Verify: Focus is on the Wrapped Card view

#### 11.2 No Focus Traps
1. Navigate through the entire app using Tab only
2. Verify: You can always Tab out of any section
3. Verify: Focus never gets stuck on a single element
4. Verify: You can Tab to the end of the page and back to the beginning

### Expected Result
- ✅ Focus is managed correctly
- ✅ Focus is restored to appropriate element
- ✅ No focus traps
- ✅ Focus order is logical

---

## Test 12: Accessibility Audit with Lighthouse

### Objective
Verify accessibility score using Lighthouse.

### Procedure

1. Open the app in Chrome
2. Press F12 to open DevTools
3. Go to "Lighthouse" tab
4. Select "Accessibility"
5. Click "Analyze page load"
6. Wait for audit to complete
7. Verify:
   - Accessibility score is 90 or higher
   - No critical issues
   - Review any warnings

### Expected Result
- ✅ Accessibility score is 90+
- ✅ No critical issues
- ✅ All WCAG AA criteria met

---

## Checklist for Manual Testing

### Keyboard Navigation
- [ ] All interactive elements are focusable via Tab
- [ ] Focus ring is visible on all focused elements
- [ ] Tab order is logical (left-to-right, top-to-bottom)
- [ ] No focus traps
- [ ] Enter key activates buttons and submits forms
- [ ] Escape key closes modals (if applicable)

### Screen Reader
- [ ] All text is announced correctly
- [ ] All buttons are announced as buttons
- [ ] All form labels are announced with inputs
- [ ] All headings are announced with level
- [ ] Dynamic content is announced when it appears
- [ ] Error messages are announced
- [ ] Loading states are announced

### Color Contrast
- [ ] All text has contrast ratio of at least 4.5:1
- [ ] All interactive elements have sufficient contrast
- [ ] Color is not the only means of conveying information

### Semantic HTML
- [ ] Headings use `<h1>`, `<h2>`, `<h3>` tags
- [ ] Form inputs use `<input>`, `<select>`, `<textarea>` tags
- [ ] Buttons use `<button>` tags
- [ ] Form labels use `<label>` tags with `htmlFor` attribute
- [ ] Sections use `<section>` tags

### Responsive Accessibility
- [ ] App is accessible on mobile (390px)
- [ ] App is accessible on tablet (768px)
- [ ] App is accessible on desktop (1024px+)
- [ ] No horizontal scrolling on any breakpoint
- [ ] Touch targets are at least 44px on mobile

### Focus Management
- [ ] Focus is managed correctly
- [ ] Focus is restored to appropriate element
- [ ] No focus traps
- [ ] Focus order is logical

---

## Troubleshooting

### Issue: Focus ring not visible
**Solution:** Check browser zoom level (should be 100%). Try different browser. Check CSS for `outline: none` that might be hiding focus ring.

### Issue: Screen reader not announcing content
**Solution:** Ensure screen reader is in "Focus Mode" (not "Browse Mode"). Check that content is not hidden with `display: none` or `visibility: hidden`. Verify ARIA attributes are correct.

### Issue: Color contrast too low
**Solution:** Use WebAIM Contrast Checker to verify. Adjust text color or background color. Ensure sufficient contrast for all text.

### Issue: Focus trap
**Solution:** Check for modal dialogs that might be trapping focus. Verify Tab key can navigate out of all sections. Check for `tabindex` attributes that might be causing issues.

---

## Resources

- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM:** https://webaim.org/
- **NVDA Screen Reader:** https://www.nvaccess.org/
- **JAWS Screen Reader:** https://www.freedomscientific.com/products/software/jaws/
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **Lighthouse:** https://developers.google.com/web/tools/lighthouse

---

## Sign-Off

- **Tested By:** [Your Name]
- **Date:** [Date]
- **Result:** ✅ WCAG 2.1 AA Compliant

