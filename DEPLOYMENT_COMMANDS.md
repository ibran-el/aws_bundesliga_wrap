# Deployment Commands - Bundesliga Wrapped

Quick reference for all commands needed to deploy to AWS Amplify.

---

## Step 1: Prepare Local Repository

### Commit All Changes
```bash
cd d:\3MRY5\AWS\C1
git add .
git commit -m "Task 17: Deploy to Amplify - frontend build complete"
```

### Verify Git Status
```bash
git status
```

Expected output:
```
On branch main
nothing to commit, working tree clean
```

---

## Step 2: Create GitHub Repository

### Option A: Using GitHub CLI (if installed)
```bash
gh repo create bundesliga-wrapped --public --source=. --remote=origin --push
```

### Option B: Manual Steps
1. Go to https://github.com/new
2. Fill in:
   - Repository name: `bundesliga-wrapped`
   - Description: `Bundesliga Wrapped - AI-powered season recap with tactical insights`
   - Visibility: Public
3. Click "Create repository"
4. Copy the repository URL (e.g., `https://github.com/YOUR_USERNAME/bundesliga-wrapped.git`)

---

## Step 3: Push to GitHub

### Add Remote
```bash
git remote add origin https://github.com/YOUR_USERNAME/bundesliga-wrapped.git
```

### Verify Remote
```bash
git remote -v
```

Expected output:
```
origin  https://github.com/YOUR_USERNAME/bundesliga-wrapped.git (fetch)
origin  https://github.com/YOUR_USERNAME/bundesliga-wrapped.git (push)
```

### Rename Branch to Main (if needed)
```bash
git branch -M main
```

### Push to GitHub
```bash
git push -u origin main
```

Expected output:
```
Enumerating objects: ...
Counting objects: ...
Compressing objects: ...
Writing objects: ...
Total ... (delta ...), reused ... (delta ...)
remote: Resolving deltas: 100% (...), done.
To https://github.com/YOUR_USERNAME/bundesliga-wrapped.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

### Verify Push
```bash
git log --oneline -5
```

---

## Step 4: Connect to AWS Amplify

### Prerequisites
- AWS Account with Amplify access
- GitHub account with repository access

### Manual Steps
1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/
2. Click "Create app" → "Host web app"
3. Select "GitHub" as the repository service
4. Click "Authorize AWS Amplify" (if first time)
5. Select repository: `bundesliga-wrapped`
6. Select branch: `main`
7. Click "Next"
8. Review build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Base directory: `frontend`
9. Click "Save and deploy"

### Using AWS CLI (Optional)
```bash
# List Amplify apps
aws amplify list-apps --region us-east-1

# Create app (requires GitHub token)
aws amplify create-app \
  --name bundesliga-wrapped \
  --repository https://github.com/YOUR_USERNAME/bundesliga-wrapped.git \
  --region us-east-1
```

---

## Step 5: Monitor Deployment

### Check Build Status
1. Go to AWS Amplify Console
2. Select your app: `bundesliga-wrapped`
3. Click "Deployments" tab
4. Watch the build progress

### Expected Build Output
```
Build started
Running npm ci...
npm notice
npm notice New minor version of npm available: 10.x.x → 10.y.y
npm notice To update run: npm install -g npm@10.y.y
npm notice
added XXX packages in XXs

Running npm run build...
> frontend@0.0.0 build
> vite build

vite v8.0.13 building client environment for production...
✓ 29 modules transformed.
computing gzip size...
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-BwqI-5CO.css   12.64 kB │ gzip:  3.16 kB
dist/assets/index-DBFPm-aV.js   227.64 kB │ gzip: 68.25 kB

✓ built in 316ms

Build completed successfully
```

### Expected Build Time
- First build: 2-3 minutes
- Subsequent builds: 1-2 minutes (with caching)

---

## Step 6: Access Live Application

### Get Live URL
1. Go to AWS Amplify Console
2. Select your app: `bundesliga-wrapped`
3. Copy the live URL (e.g., `https://main.d1234567890.amplifyapp.com`)

### Test Live URL
```bash
# Open in browser (replace with your actual URL)
https://main.d1234567890.amplifyapp.com
```

### Verify HTTPS
- Look for green lock icon in browser address bar
- URL should start with `https://`

---

## Step 7: Test Live Application

### Quick Test Commands (in browser console)
```javascript
// Test API connectivity
fetch('https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod/clubs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
.then(r => r.json())
.then(d => console.log('Clubs:', d.clubs.length))
.catch(e => console.error('Error:', e))
```

### Manual Testing Checklist
- [ ] Landing page loads
- [ ] Club selection works
- [ ] User input form works
- [ ] Wrapped card generates
- [ ] MVP leaderboard displays
- [ ] Substitution simulator works
- [ ] All API calls succeed
- [ ] No console errors

---

## Step 8: Continuous Deployment

### Auto-Deploy on Push
```bash
# Make a change to the code
echo "# Updated" >> README.md

# Commit and push
git add README.md
git commit -m "Update README"
git push origin main
```

Amplify will automatically:
1. Detect the push
2. Trigger a new build
3. Deploy the updated app
4. Provide a new deployment URL

### View Deployment History
1. Go to AWS Amplify Console
2. Select your app
3. Click "Deployments" tab
4. See all previous deployments

### Rollback to Previous Deployment
1. Go to AWS Amplify Console
2. Click "Deployments" tab
3. Find the deployment you want to rollback to
4. Click "Redeploy"
5. Wait for deployment to complete

---

## Troubleshooting Commands

### Check Build Logs
```bash
# In AWS Amplify Console:
# 1. Select your app
# 2. Click "Deployments" tab
# 3. Click on a deployment
# 4. Scroll down to see build logs
```

### Verify Local Build
```bash
cd d:\3MRY5\AWS\C1\frontend
npm ci
npm run build
```

### Check Git Remote
```bash
git remote -v
```

### Check Git Status
```bash
git status
```

### View Recent Commits
```bash
git log --oneline -10
```

### Check Node Version
```bash
node --version
npm --version
```

### Clear npm Cache (if build fails)
```bash
npm cache clean --force
```

### Reinstall Dependencies
```bash
cd d:\3MRY5\AWS\C1\frontend
rm -r node_modules package-lock.json
npm install
npm run build
```

---

## Environment Variables (if needed)

### Add Environment Variables in Amplify Console
1. Go to AWS Amplify Console
2. Select your app
3. Click "Environment variables"
4. Add variables:
   - Key: `VITE_API_BASE`
   - Value: `https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod`

### Use in Frontend Code
```javascript
const API_BASE = import.meta.env.VITE_API_BASE || 'https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod';
```

---

## Custom Domain Setup (Optional)

### Add Custom Domain
```bash
# In AWS Amplify Console:
# 1. Select your app
# 2. Click "Domain management"
# 3. Click "Add domain"
# 4. Enter your domain (e.g., bundesliga-wrapped.com)
# 5. Follow DNS configuration steps
```

### DNS Configuration
1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Update DNS records as shown in Amplify Console
3. Wait for DNS propagation (5-30 minutes)

---

## Monitoring and Analytics

### View Build Metrics
```bash
# In AWS Amplify Console:
# 1. Select your app
# 2. Click "Analytics" tab
# 3. View build times, deployment frequency, etc.
```

### Monitor API Performance
```bash
# In browser DevTools:
# 1. Open DevTools (F12)
# 2. Go to Network tab
# 3. Interact with app
# 4. Check response times for each API call
```

### Check CloudWatch Logs
```bash
# In AWS Console:
# 1. Go to CloudWatch
# 2. Click "Logs"
# 3. Select log group: /aws/lambda/[function-name]
# 4. View Lambda execution logs
```

---

## Cleanup Commands

### Remove Local Build
```bash
cd d:\3MRY5\AWS\C1\frontend
rm -r dist
```

### Remove Node Modules (to save space)
```bash
cd d:\3MRY5\AWS\C1\frontend
rm -r node_modules
```

### Remove Git Remote (if needed)
```bash
git remote remove origin
```

---

## Quick Reference

### Most Common Commands
```bash
# Commit and push
git add .
git commit -m "Your message"
git push origin main

# Build locally
npm run build

# Test locally
npm run dev

# Run tests
npm test

# Check status
git status
git log --oneline -5
```

### Amplify Console URLs
- Main: https://console.aws.amazon.com/amplify/
- Your App: https://console.aws.amazon.com/amplify/apps/[app-id]
- Deployments: https://console.aws.amazon.com/amplify/apps/[app-id]/deployments

### API Endpoint
```
https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod
```

### Live URL Format
```
https://main.d[app-id].amplifyapp.com
```

---

## Support

### If Build Fails
1. Check build logs in Amplify Console
2. Verify package.json has correct build script
3. Verify amplify.yml is correct
4. Try clearing npm cache: `npm cache clean --force`
5. Try reinstalling dependencies: `rm -r node_modules && npm install`

### If API Calls Fail
1. Check API endpoint in src/api.js
2. Verify API Gateway CORS is enabled
3. Check Lambda function logs in CloudWatch
4. Verify network connectivity

### If Deployment Hangs
1. Check Amplify Console for build status
2. Try canceling and redeploying
3. Check GitHub for any issues
4. Contact AWS Support if problem persists

---

## Success Indicators

✅ Build completes in 2-3 minutes
✅ Live URL is accessible
✅ HTTPS is enabled (green lock)
✅ Landing page loads
✅ All API calls succeed
✅ No console errors
✅ Responsive design works
✅ Accessibility score is 90+

---

**Last Updated:** Task 17 Completion
**Status:** Ready for Deployment
