# Local Testing Guide - Bundesliga Wrapped

## Dev Server Status

✅ **Dev server is running on http://localhost:5173/**

The Vite development server has started successfully and is ready for local testing.

---

## How to Access the App

### In Your Browser
1. Open your browser
2. Navigate to: **http://localhost:5173/**
3. The Bundesliga Wrapped app should load

### Expected Behavior
- Landing page displays with title "Bundesliga Wrapped"
- "Get Started" button is clickable
- No console errors

---

## Testing Checklist

### 1. Landing Page
- [ ] Page loads without errors
- [ ] Title: "Bundesliga Wrapped"
- [ ] Subtitle: "The Manager's Wrapped: From Passive Fan to Tactical Coach"
- [ ] Description text is visible
- [ ] "Get Started" button is clickable
- [ ] Responsive on your screen size

### 2. Club Selection
- [ ] Click "Get Started" button
- [ ] All 18 clubs display in a grid
- [ ] Club colors load correctly (primary_color as background)
- [ ] Club names are readable
- [ ] Click a club to select it
- [ ] Verify selection works

### 3. User Input Form
- [ ] Selected club is displayed
- [ ] Name input field is visible
- [ ] Enter your name (e.g., "John Doe")
- [ ] Tactical Style dropdown shows options:
  - Tactical Mastermind
  - Data Analyst
  - The Gaffer
  - Highlight Addict
  - Match Day Devotee
  - Casual Observer
- [ ] Select a tactical style
- [ ] "Generate Wrapped" button becomes enabled
- [ ] Click "Generate Wrapped"

### 4. Wrapped Card Generation
- [ ] Loading spinner appears
- [ ] Wait for Bedrock AI to generate narrative (3-5 seconds)
- [ ] Wrapped card displays with:
  - [ ] Greeting with your name
  - [ ] Season story (3-4 sentences)
  - [ ] Fan stat (e.g., "You watched 47 matches")
  - [ ] Tactical identity (matches your selection)
  - [ ] Season verdict (1-2 sentences)
  - [ ] Shareable text
- [ ] Card background is club color
- [ ] Text is readable
- [ ] "Share" button is clickable
- [ ] "Next" button is clickable

### 5. MVP Leaderboard
- [ ] Click "Next" button
- [ ] "Season MVP — Data-Driven Ranking" heading displays
- [ ] 3 MVP cards display with:
  - [ ] Rank badge (1st, 2nd, 3rd)
  - [ ] Player name
  - [ ] Impact Score (0-100)
  - [ ] Stats grid with:
    - Goal Participations
    - xG (Expected Goals)
    - xG Efficiency
    - Distance per 90 km
    - Max Speed km/h
  - [ ] Scout report (headline, 3-sentence report, season label)
- [ ] Players sorted by Impact Score descending
- [ ] "Try Manager Mode" button is clickable

### 6. Tactical Substitution Simulator
- [ ] Click "Try Manager Mode" button
- [ ] "Manager Mode — Tactical Substitution Simulator" heading displays
- [ ] Match Picker dropdown shows "Select a Match"
- [ ] Click dropdown to see matches
- [ ] Select a match (e.g., "Match Day 1: Bayern vs Opponent (Result)")
- [ ] Match info displays:
  - [ ] Match day
  - [ ] Home team
  - [ ] Away team
  - [ ] Result
  - [ ] Formation
- [ ] Starting XI displays with:
  - [ ] Shirt numbers
  - [ ] Player names
  - [ ] Positions
- [ ] Bench players display below
- [ ] Click a starter player to select
- [ ] Click a bench player to select
- [ ] "Analyze Substitution" button enables when both selected
- [ ] Click "Analyze Substitution"
- [ ] Loading spinner appears
- [ ] Tactical Analysis card displays with:
  - [ ] Synergy score (-10 to +10) with color coding
  - [ ] Synergy gauge with numeric value
  - [ ] Verdict (tactical assessment)
  - [ ] Risk (risk level)
  - [ ] Manager rating
  - [ ] Real-time note
- [ ] "Try Another Match" button is clickable

### 7. Navigation
- [ ] Back button appears on all views (except landing)
- [ ] Back button navigates to previous view
- [ ] State is preserved when navigating back
- [ ] Reset button returns to landing page

### 8. API Calls
- [ ] Open browser DevTools (F12)
- [ ] Go to Network tab
- [ ] Interact with app to trigger API calls
- [ ] Verify requests to API Gateway:
  - [ ] POST /clubs → 200 OK
  - [ ] POST /wrapped → 200 OK
  - [ ] POST /mvp → 200 OK
  - [ ] POST /substitution → 200 OK
  - [ ] POST /analyze-sub → 200 OK
- [ ] Check response times (should be < 15 seconds)
- [ ] No CORS errors in console

### 9. Responsive Design
- [ ] Open DevTools (F12)
- [ ] Click "Toggle device toolbar" (Ctrl+Shift+M)
- [ ] Test on different screen sizes:
  - [ ] Mobile (375px): iPhone SE
  - [ ] Tablet (768px): iPad
  - [ ] Desktop (1920px): Full screen
- [ ] Verify:
  - [ ] Layout adapts correctly
  - [ ] Text is readable
  - [ ] Buttons are clickable
  - [ ] No horizontal scrolling

### 10. Accessibility
- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] No JavaScript errors
- [ ] Tab through all interactive elements
- [ ] Focus ring visible on each element
- [ ] Keyboard navigation works throughout app

### 11. Error Handling
- [ ] Try entering invalid input (if applicable)
- [ ] Verify error messages are user-friendly
- [ ] No JavaScript errors in console
- [ ] App recovers gracefully from errors

---

## Browser Console Commands

You can test the API directly from the browser console:

### Test /clubs endpoint
```javascript
fetch('https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod/clubs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
.then(r => r.json())
.then(d => console.log('Clubs:', d.clubs.length, 'clubs loaded'))
.catch(e => console.error('Error:', e))
```

### Test /mvp endpoint
```javascript
fetch('https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod/mvp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
.then(r => r.json())
.then(d => console.log('MVP:', d.players.length, 'players loaded'))
.catch(e => console.error('Error:', e))
```

---

## Troubleshooting

### Issue: Page shows blank screen
**Solution:**
1. Check browser console (F12) for errors
2. Verify dev server is running: http://localhost:5173/
3. Try refreshing the page (Ctrl+R)
4. Clear browser cache (Ctrl+Shift+Delete)

### Issue: API calls fail with CORS error
**Solution:**
1. Verify API Gateway endpoint is correct
2. Check that API Gateway CORS is enabled
3. Verify Lambda function has CORS headers
4. Check browser console for exact error message

### Issue: Wrapped card doesn't generate
**Solution:**
1. Check browser console for errors
2. Verify Bedrock is responding (check CloudWatch logs)
3. Check API response in Network tab
4. Try again (Bedrock may be rate-limited)

### Issue: Images or styles don't load
**Solution:**
1. Check Network tab in DevTools
2. Verify all assets are loading (200 status)
3. Check for 404 errors
4. Try hard refresh (Ctrl+Shift+R)

---

## Performance Tips

### Monitor Performance
1. Open DevTools (F12)
2. Go to Performance tab
3. Click record
4. Interact with app
5. Click stop
6. Analyze performance metrics

### Check Bundle Size
1. Open DevTools (F12)
2. Go to Network tab
3. Look at file sizes:
   - index.html: ~458 B
   - CSS: ~12.64 KB
   - JS: ~227.64 KB
4. Check gzipped sizes (should be ~3KB CSS, ~68KB JS)

---

## Next Steps

### After Local Testing
1. Verify all acceptance criteria are met
2. Document any issues found
3. Fix any bugs discovered
4. Re-test if changes made
5. When satisfied, proceed to deployment

### Deployment
When ready to deploy to AWS Amplify:
1. Push code to GitHub: `git push -u origin main`
2. Connect to AWS Amplify Console
3. Select repository and branch
4. Amplify auto-deploys (2-3 minutes)
5. Test live application

---

## Support

### For Issues
1. Check browser console (F12) for errors
2. Check Network tab for failed requests
3. Review this guide for troubleshooting
4. Check PROJECT_LOG.md for known issues

### For Questions
1. Review the API_ENDPOINT_TEST_GUIDE.md
2. Check RESPONSIVE_DESIGN_TESTING.md
3. Check ACCESSIBILITY_TESTING_REPORT.md

---

## Dev Server Commands

### Stop the dev server
Press `Ctrl+C` in the terminal where the dev server is running

### Restart the dev server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Run tests
```bash
npm test
```

### Lint code
```bash
npm run lint
```

---

**Status:** ✅ Dev server running on http://localhost:5173/

**Ready for local testing!** 🚀
