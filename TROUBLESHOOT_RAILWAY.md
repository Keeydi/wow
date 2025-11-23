# Troubleshooting Railway Backend Connection

## Error: Cannot connect to backend server

Your backend URL is: `https://wow-production-f72a.up.railway.app`

## Quick Checks

### 1. Test Backend Health Endpoint

Open in browser:
```
https://wow-production-f72a.up.railway.app/health
```

**Expected:** `{"status":"ok","timestamp":"..."}`

**If it doesn't work:**
- Backend might not be running
- Check Railway logs

### 2. Check Railway Logs

1. Go to Railway dashboard
2. Click on your service
3. Go to **"Deployments"** or **"Logs"** tab
4. Look for errors

**Common errors:**
- Missing environment variables
- Database connection failed
- Port configuration issue

### 3. Verify Environment Variables in Railway

Make sure these are set in Railway:

```
PORT=4000
CLIENT_ORIGIN=https://your-app.vercel.app,https://*.vercel.app
SUPABASE_URL=https://ovkytjxiaxlrdxkgqcch.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_7-FukegX2UlsBaO-9lMCmA_B0h6Mhob
JWT_SECRET=067157c11c419fab39832585290029a8cb7ec21f
```

**To check:**
1. Railway dashboard → Your service
2. Click **"Variables"** tab
3. Verify all variables are set

### 4. Check Railway Service Status

1. Railway dashboard → Your service
2. Check if status shows **"Active"** or **"Deployed"**
3. If it shows errors, check the logs

### 5. Verify Root Directory

Make sure Railway is using the `server` folder:

1. Railway dashboard → Your service
2. Go to **"Settings"**
3. Check **"Root Directory"** = `server`
4. If not set, add it

### 6. Check Build/Start Commands

In Railway settings, verify:
- **Build Command:** (can be empty or `npm install`)
- **Start Command:** `npm start` (or Railway auto-detects)

### 7. Common Issues

#### Issue: Backend returns 404 or connection refused
**Solution:** 
- Check Railway logs for startup errors
- Verify PORT is set to 4000
- Make sure service is deployed and running

#### Issue: CORS errors
**Solution:**
- Update `CLIENT_ORIGIN` in Railway to include your Vercel domain
- Format: `https://your-app.vercel.app,https://*.vercel.app`

#### Issue: Database connection failed
**Solution:**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Check Supabase project is active
- Test Supabase connection from Railway logs

## Quick Fix Steps

1. ✅ Test: `https://wow-production-f72a.up.railway.app/health`
2. ✅ Check Railway logs for errors
3. ✅ Verify all environment variables are set
4. ✅ Check service is deployed and running
5. ✅ Update `CLIENT_ORIGIN` with your Vercel domain
6. ✅ Redeploy if needed

## Still Not Working?

Check Railway logs and share the error message for more specific help.

