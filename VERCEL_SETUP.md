# Vercel Deployment - Quick Setup Guide

## The Problem
Your Vercel frontend is trying to connect to `http://localhost:4000`, which doesn't work in production. You need to configure the backend API URL.

## Solution: Set Environment Variable in Vercel

### Step 1: Get Your Backend Server URL

Your backend needs to be deployed somewhere accessible. Options:
- **Railway** (railway.app)
- **Render** (render.com)
- **Heroku** (heroku.com)
- **DigitalOcean App Platform**
- **Your own VPS/server**

**Example backend URLs:**
- `https://your-backend.railway.app`
- `https://your-backend.onrender.com`
- `https://api.yourdomain.com`

### Step 2: Add Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `VITE_API_URL`
   - **Value:** Your backend server URL (e.g., `https://your-backend.railway.app`)
   - **Environment:** Select all (Production, Preview, Development)
4. Click **Save**

### Step 3: Redeploy

After adding the environment variable:
1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on your latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### Step 4: Update Backend CORS

Your backend server needs to allow requests from your Vercel domain.

In your backend `server/.env` file, update `CLIENT_ORIGIN`:

```env
CLIENT_ORIGIN=https://your-app.vercel.app,https://your-custom-domain.com
```

Or if you want to allow all Vercel preview deployments:
```env
CLIENT_ORIGIN=https://*.vercel.app
```

**Important:** After updating backend `.env`, restart your backend server.

## Quick Checklist

- [ ] Backend server is deployed and accessible (not localhost)
- [ ] `VITE_API_URL` is set in Vercel environment variables
- [ ] Backend `CLIENT_ORIGIN` includes your Vercel domain
- [ ] Redeployed Vercel app after setting environment variable
- [ ] Backend server is running and accessible

## Testing

1. Visit your Vercel app URL
2. Open browser console (F12)
3. Check Network tab - API calls should go to your backend URL (not localhost)
4. Try logging in

## Common Issues

### Still seeing localhost errors
- Make sure you redeployed after adding the environment variable
- Check that the variable name is exactly `VITE_API_URL` (case-sensitive)
- Verify it's set for the correct environment (Production/Preview)

### CORS errors
- Update backend `CLIENT_ORIGIN` to include your Vercel URL
- Restart backend server after updating `.env`

### Backend not accessible
- Make sure backend is deployed and running
- Test backend health endpoint: `https://your-backend-url.com/health`
- Check backend logs for errors

