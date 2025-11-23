# Fix Railway 404 Error - Set Root Directory

## The Problem
Railway is deploying from the root directory, but your backend code is in the `server` folder. That's why you get 404 errors.

## The Fix

### Step 1: Set Root Directory in Railway

1. In Railway dashboard, go to your service
2. Click **"Settings"** tab
3. Scroll down to **"Source"** section
4. Click **"Add Root Directory"** (or edit if it exists)
5. Enter: `server`
6. Click **"Save"** or **"Update"**

### Step 2: Verify Build/Start Commands

In Railway Settings, make sure:

**Build Command:** (can be empty, or `npm install && npm run build`)

**Start Command:** `npm start`

Railway should auto-detect these, but verify they're correct.

### Step 3: Redeploy

After setting Root Directory:

1. Railway will automatically redeploy
2. Or go to **"Deployments"** tab
3. Click **"Redeploy"**

### Step 4: Test Again

After redeploy completes, test:
```
https://wow-production-f72a.up.railway.app/health
```

Should now show: `{"status":"ok","timestamp":"..."}`

## Quick Checklist

- [ ] Root Directory set to `server` in Railway Settings
- [ ] Build Command: `npm install && npm run build` (or empty)
- [ ] Start Command: `npm start`
- [ ] All environment variables are set
- [ ] Service redeployed
- [ ] Health endpoint works: `/health`

## That's It!

Once Root Directory is set to `server`, Railway will:
1. Look for `package.json` in the `server` folder
2. Run `npm install` in `server` folder
3. Run `npm run build` (compiles TypeScript)
4. Run `npm start` (starts the server)
5. Your backend will be accessible! ✅

