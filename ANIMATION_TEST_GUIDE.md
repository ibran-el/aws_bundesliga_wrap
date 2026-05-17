# Animation Test Guide — WrappedCardReveal Component

## Overview
This guide provides manual testing procedures to verify all 7 animation phases of the WrappedCardReveal component work correctly with proper timing, visual effects, and numeric counter accuracy.

## Test Environment Setup

### Prerequisites
- Node.js 16+ and npm 8+ installed
- Frontend dev server running: `npm run dev` (port 3000)
- Browser DevTools open (F12)
- Performance tab ready to measure frame rates

### Mock Data
The component uses the following mock data for testing:
```javascript
{
  user_name: 'John',
  favorite_club: 'Bayern Munich',
  profile: {
    archetype: 'Tactical Mastermind',
    total_interactions: 150,
    engagement_score: 85,
  },
  wrapped_card: {
    greeting: 'Hello John!',
    season_story: 'What a season it has been.',
    fan_stat: 'You watched 42 videos.',
    tactical_identity: 'You prefer possession-based football.',
    season_verdict: 'Outstanding season!',
    share_text: 'I am a Bundesliga fan!',
  },
  mvp_analysis: {
    players: [
      { name: 'Robert Lewandowski', impact_score: 95 },
      { name: 'Serge Gnabry', impact_score: 88 },
      { name: 'Dayot Upamecano', impact_score: 82 },
    ],
  },
}
```

---

## Phase-by-Phase Test Cases

### Phase 1: Burst (0–0.8s)
**Objective:** Verify black screen displays for 0.5s, then radial pulse animates from center

**Test Steps:**
1. Start the reveal animation
2. Observe black screen fills entire viewport
3. At ~0.5s mark, radial pulse begins from center
4. Pulse expands outward with club color (e.g., Bayern blue)
5. At 0.8s, pulse completes and fades

**Expected Results:**
- ✅ Black screen visible for 0.5s (±50ms tolerance)
- ✅ Radial pulse starts at center point
- ✅ Pulse uses club color (#0066CC for Bayern)
- ✅ Pulse opacity fades from 1.0 to 0.8
- ✅ Total phase duration: 0.8s (±50ms)

**Verification:**
- Use browser DevTools Performance tab to measure timing
- Check Network tab to confirm no API calls during animation
- Verify pulse expands smoothly (60 FPS)

---

### Phase 2: Name Reveal (0.8–2.0s)
**Objective:** Verify user name types character-by-character over 1.2s using monospace font

**Test Steps:**
1. After burst completes, observe name appears character-by-character
2. Count characters appearing: J → Jo → Joh → John
3. Verify monospace font (Courier New or similar)
4. Verify cursor blink animation during typing
5. At 1.2s, full name "John" is displayed

**Expected Results:**
- ✅ Name types smoothly character-by-character
- ✅ Monospace font applied (font-mono class)
- ✅ Cursor blink visible during typing
- ✅ Total phase duration: 1.2s (±50ms)
- ✅ Character timing: 1200ms / 4 chars = 300ms per char

**Verification:**
- Measure time from first character to last character
- Verify font is monospace (not proportional)
- Check cursor animation is smooth

---

### Phase 3: Archetype Badge (2.0–2.6s)
**Objective:** Verify archetype badge slides up from bottom with smooth animation

**Test Steps:**
1. After name finishes typing, observe badge appears
2. Badge starts below viewport (translateY: 100px)
3. Badge slides up smoothly to final position
4. Badge text: "Tactical Mastermind"
5. At 0.6s, badge settles in place

**Expected Results:**
- ✅ Badge starts 100px below final position
- ✅ Badge slides up smoothly (ease-out curve)
- ✅ Badge opacity fades in from 0 to 1
- ✅ Total phase duration: 0.6s (±50ms)
- ✅ Badge background: semi-transparent white or black

**Verification:**
- Measure badge position at start and end
- Verify ease-out curve (smooth deceleration)
- Check opacity transition

---

### Phase 4: Stat Cards (2.6–4.0s)
**Objective:** Verify 3 stat cards appear with 300ms stagger and count from 0 to final value

**Test Steps:**
1. After badge settles, first stat card appears (Videos Watched)
2. Card starts with opacity 0 and scale 0.9
3. Card animates to opacity 1 and scale 1.0
4. Counter starts at 0 and counts up to 42 over 0.8s
5. At 300ms, second card appears (Stories Viewed)
6. Second card counter counts from 0 to 156 over 0.8s
7. At 600ms, third card appears (Fan Score)
8. Third card counter counts from 0 to 87 over 0.8s

**Expected Results:**
- ✅ Card 1 appears at 0ms, counter reaches 42 at 800ms
- ✅ Card 2 appears at 300ms, counter reaches 156 at 1100ms
- ✅ Card 3 appears at 600ms, counter reaches 87 at 1400ms
- ✅ Counters use ease-out curve (smooth deceleration)
- ✅ Final values are exact (no rounding errors)
- ✅ Total phase duration: 1.4s (±50ms)

**Verification:**
- Measure counter values at 0.4s, 0.8s, 1.2s marks
- Verify final values: 42, 156, 87 (exact)
- Check ease-out curve (counters accelerate then decelerate)
- Measure stagger timing: 300ms between cards

**Counter Accuracy Test:**
```javascript
// In browser console, measure counter values:
// At 0.4s: should be ~50% of final value
// At 0.8s: should be 100% of final value
// Ease-out formula: 1 - (1-t)^3
// At t=0.5: easeOut = 1 - (0.5)^3 = 0.875 (87.5%)
```

---

### Phase 5: Narrative Cards (4.0–5.2s)
**Objective:** Verify 5 narrative cards slide in from bottom with 200ms stagger

**Test Steps:**
1. After stat cards complete, first narrative card appears (Greeting)
2. Card starts 50px below final position (translateY: 50px)
3. Card slides up smoothly to final position
4. Card text: "Hello John!"
5. At 200ms, second card appears (Season Story)
6. At 400ms, third card appears (Fan Stat)
7. At 600ms, fourth card appears (Tactical Identity)
8. At 800ms, fifth card appears (Season Verdict)

**Expected Results:**
- ✅ Card 1 appears at 0ms, settles at 600ms
- ✅ Card 2 appears at 200ms, settles at 800ms
- ✅ Card 3 appears at 400ms, settles at 1000ms
- ✅ Card 4 appears at 600ms, settles at 1200ms
- ✅ Card 5 appears at 800ms, settles at 1400ms (but phase ends at 1200ms)
- ✅ Cards use ease-out curve
- ✅ Total phase duration: 1.2s (±50ms)

**Verification:**
- Measure card appearance timing: 200ms stagger
- Verify all 5 cards are visible by end of phase
- Check ease-out curve on slide animation

---

### Phase 6: MVP Slam (5.2–5.7s)
**Objective:** Verify MVP player name appears with gold flash and slam effect

**Test Steps:**
1. After narrative cards complete, MVP name appears
2. Name starts with scale 0.5 and translateY 50px (below)
3. Name animates to scale 1.0 and translateY 0 (final position)
4. Gold flash effect: drop-shadow starts at 0, peaks at 20px, returns to 0
5. Font: Bebas Neue (bold, uppercase-style)
6. Text: "Robert Lewandowski"

**Expected Results:**
- ✅ MVP name scales from 0.5 to 1.0
- ✅ MVP name slides up from 50px below
- ✅ Gold flash (FFD700) appears and fades
- ✅ Drop-shadow peaks at 20px blur radius
- ✅ Font is Bebas Neue
- ✅ Total phase duration: 0.5s (±50ms)

**Verification:**
- Measure name scale at start and end
- Verify gold color (#FFD700) in drop-shadow
- Check font is Bebas Neue (distinctive style)
- Measure drop-shadow blur radius

---

### Phase 7: Share Pulse (5.7–6.5s)
**Objective:** Verify share card pulses with club color glow

**Test Steps:**
1. After MVP name settles, share card appears
2. Card starts with scale 1.0
3. Card pulses: scale 1.0 → 1.05 → 1.0
4. Drop-shadow pulses: 0 → 15px → 0
5. Drop-shadow color: club color (e.g., Bayern blue)
6. Text: "I am a Bundesliga fan!"

**Expected Results:**
- ✅ Card scales from 1.0 to 1.05 and back to 1.0
- ✅ Drop-shadow blur radius: 0 → 15px → 0
- ✅ Drop-shadow color matches club color
- ✅ Pulse is smooth and continuous
- ✅ Total phase duration: 0.8s (±50ms)

**Verification:**
- Measure card scale at peak (should be 1.05)
- Verify drop-shadow color matches club color
- Check pulse timing: 0.8s total

---

### Phase 8: Done (6.5+)
**Objective:** Verify all animations complete and full card is interactive

**Test Steps:**
1. After share pulse completes, all animations stop
2. Full Wrapped card is visible and interactive
3. Skip button disappears
4. Share button is clickable
5. All text is readable and properly formatted

**Expected Results:**
- ✅ All animations complete by 6.5s (±50ms)
- ✅ Skip button is hidden
- ✅ Share button is visible and clickable
- ✅ All content is visible and readable
- ✅ No layout shifts or jank

**Verification:**
- Measure total animation duration: 6.5s (±50ms)
- Click Share button and verify clipboard copy works
- Check for any console errors

---

## Skip Functionality Test

**Objective:** Verify skip button works at any phase and jumps to done state

**Test Steps:**
1. Start reveal animation
2. At 1.0s (during name phase), click Skip button
3. Verify all animations stop immediately
4. Verify full card is displayed
5. Verify Skip button is hidden
6. Repeat at different phases: burst, archetype, stats, narrative, mvp, share

**Expected Results:**
- ✅ Skip button visible during all phases (except done)
- ✅ Clicking skip jumps to done phase immediately
- ✅ All content is displayed correctly
- ✅ No animation artifacts or glitches
- ✅ Final state is identical regardless of skip timing

**Verification:**
- Test skip at each phase
- Verify final state is consistent
- Check for any console errors

---

## Responsive Design Test

**Objective:** Verify animations work correctly at different viewport sizes

**Test Cases:**
1. **Mobile (390px):** iPhone SE
2. **Tablet (768px):** iPad
3. **Desktop (1024px+):** Desktop monitor

**Test Steps for Each Breakpoint:**
1. Resize viewport to target size
2. Start reveal animation
3. Verify all animations play smoothly
4. Verify no horizontal scrolling
5. Verify text is readable
6. Verify cards stack vertically on mobile

**Expected Results:**
- ✅ Animations play smoothly at all breakpoints
- ✅ No layout shifts or overflow
- ✅ Text is readable without zoom
- ✅ Cards are properly sized for viewport
- ✅ Frame rate remains 60 FPS

**Verification:**
- Use Chrome DevTools device emulation
- Measure frame rate in Performance tab
- Check for layout shifts in Rendering tab

---

## Performance Test

**Objective:** Verify animations run at 60 FPS with no jank

**Test Steps:**
1. Open Chrome DevTools Performance tab
2. Start recording
3. Play full reveal animation
4. Stop recording
5. Analyze frame rate and jank

**Expected Results:**
- ✅ Frame rate: 60 FPS (or close to it)
- ✅ No dropped frames during animations
- ✅ No long tasks (>50ms)
- ✅ Smooth transitions between phases

**Verification:**
- Check Performance tab for frame rate
- Look for red bars (dropped frames)
- Verify no long tasks in Main thread

---

## Accessibility Test

**Objective:** Verify animations don't interfere with accessibility

**Test Steps:**
1. Use keyboard only to navigate (Tab key)
2. Verify Skip button is focusable
3. Verify Share button is focusable
4. Use screen reader (NVDA or JAWS) to verify announcements
5. Verify focus ring is visible on all buttons

**Expected Results:**
- ✅ Skip button is focusable and clickable
- ✅ Share button is focusable and clickable
- ✅ Focus ring is visible on all buttons
- ✅ Screen reader announces all text correctly
- ✅ No animation-related accessibility issues

**Verification:**
- Test with keyboard only
- Test with screen reader
- Check for focus ring visibility

---

## Browser Compatibility Test

**Objective:** Verify animations work in all supported browsers

**Test Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Test Steps for Each Browser:**
1. Open app in browser
2. Start reveal animation
3. Verify all animations play correctly
4. Verify no console errors
5. Verify performance is acceptable

**Expected Results:**
- ✅ Animations play smoothly in all browsers
- ✅ No console errors
- ✅ Performance is acceptable (60 FPS or close)
- ✅ Visual effects are consistent

**Verification:**
- Test in each browser
- Check console for errors
- Measure frame rate

---

## Timing Accuracy Test

**Objective:** Verify all phase timings are within ±50ms tolerance

**Test Procedure:**
```javascript
// In browser console, add timing measurements:
const timings = {};
const startTime = performance.now();

// Measure each phase transition
// Phase 1: burst (0–0.8s)
// Phase 2: name (0.8–2.0s)
// Phase 3: archetype (2.0–2.6s)
// Phase 4: stats (2.6–4.0s)
// Phase 5: narrative (4.0–5.2s)
// Phase 6: mvp (5.2–5.7s)
// Phase 7: share (5.7–6.5s)
// Phase 8: done (6.5+)

// Expected total: 6.5s ± 50ms
```

**Expected Results:**
- ✅ Phase 1: 800ms ± 50ms
- ✅ Phase 2: 1200ms ± 50ms
- ✅ Phase 3: 600ms ± 50ms
- ✅ Phase 4: 1400ms ± 50ms
- ✅ Phase 5: 1200ms ± 50ms
- ✅ Phase 6: 500ms ± 50ms
- ✅ Phase 7: 800ms ± 50ms
- ✅ Total: 6500ms ± 50ms

---

## Numeric Counter Accuracy Test

**Objective:** Verify stat counters reach exact final values with no rounding errors

**Test Procedure:**
```javascript
// In browser console, measure counter values:
// Expected final values:
// - Videos Watched: 42
// - Stories Viewed: 156
// - Fan Score: 87

// Measure at key points:
// At 0.4s (50% progress): should be ~87.5% of final (ease-out)
// At 0.8s (100% progress): should be exactly final value
```

**Expected Results:**
- ✅ Videos Watched final value: 42 (exact)
- ✅ Stories Viewed final value: 156 (exact)
- ✅ Fan Score final value: 87 (exact)
- ✅ No rounding errors
- ✅ Ease-out curve applied correctly

**Verification:**
- Measure counter values at key points
- Verify final values are exact
- Check ease-out curve formula: 1 - (1-t)^3

---

## Summary Checklist

- [ ] Phase 1 (Burst): Black screen 0.5s, radial pulse 0.8s
- [ ] Phase 2 (Name): Character typing 1.2s, monospace font
- [ ] Phase 3 (Archetype): Badge slide-up 0.6s
- [ ] Phase 4 (Stats): 3 cards with 300ms stagger, count 0→final 0.8s each
- [ ] Phase 5 (Narrative): 5 cards with 200ms stagger, slide-up 0.6s each
- [ ] Phase 6 (MVP): Gold flash + slam 0.5s, Bebas Neue font
- [ ] Phase 7 (Share): Pulse with club color glow 0.8s
- [ ] Phase 8 (Done): All animations complete, card interactive
- [ ] Skip button: Works at any phase, jumps to done
- [ ] Responsive: Works at 390px, 768px, 1024px+
- [ ] Performance: 60 FPS, no jank
- [ ] Accessibility: Keyboard navigation, screen reader support
- [ ] Browser compatibility: Chrome, Firefox, Safari, Edge
- [ ] Timing accuracy: All phases within ±50ms tolerance
- [ ] Counter accuracy: Final values exact, no rounding errors

---

## Notes

- All timings are measured from the start of the reveal animation
- Tolerance for timing: ±50ms (acceptable variance)
- Frame rate target: 60 FPS (or close to it)
- All animations use CSS keyframes and requestAnimationFrame (no external libraries)
- Component is fully responsive and accessible

