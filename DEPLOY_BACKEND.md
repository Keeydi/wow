# Deploy Backend Server (Supabase Database)

Your backend uses **Supabase as the database**, but you still need to deploy the **Express server** that connects to Supabase.

## Architecture Overview

```
Frontend (Vercel) → Express Backend Server → Supabase Database
```

- **Frontend**: Deployed on Vercel ✅
- **Database**: Supabase (already configured) ✅
- **Backend Server**: Needs to be deployed ⚠️

## Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click **New Project** → **Deploy from GitHub repo**
4. Select your repository
5. Railway will auto-detect it's a Node.js project
6. Set environment variables in Railway:
   ```
   PORT=4000
   CLIENT_ORIGIN=https://your-app.vercel.app,https://*.vercel.app
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   JWT_SECRET=your-jwt-secret
   ```
7. Railway will deploy automatically
8. Get your backend URL (e.g., `https://your-app.railway.app`)

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Sign up/login
3. Click **New** → **Web Service**
4. Connect your GitHub repo
5. Configure:
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
   - **Root Directory**: `server`
6. Add environment variables (same as Railway)
7. Deploy

### Option 3: Fly.io

1. Install Fly CLI: `npm i -g flyctl`
2. In your `server` directory, run: `flyctl launch`
3. Follow prompts
4. Set environment variables: `flyctl secrets set KEY=value`

## After Backend is Deployed

1. **Get your backend URL** (e.g., `https://your-backend.railway.app`)

2. **Update Vercel environment variable**:
   - Go to Vercel → Settings → Environment Variables
   - Set `VITE_API_URL` to your backend URL
   - Redeploy

3. **Update backend CORS** (if needed):
   - In your backend deployment, set `CLIENT_ORIGIN` to include your Vercel URL
   - Or update it in the deployment platform's environment variables

## Environment Variables Needed

### Backend Server (Railway/Render/etc.)
```env
PORT=4000
CLIENT_ORIGIN=https://your-app.vercel.app,https://*.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-key
```

### Frontend (Vercel)
```env
VITE_API_URL=https://your-backend.railway.app
```

## Testing

1. Test backend health: `https://your-backend-url.com/health`
2. Should return: `{"status":"ok","timestamp":"..."}`
3. Test from Vercel frontend - login should work

## Quick Start with Railway

```bash
# Install Railway CLI (optional)
npm i -g @railway/cli

# Login
railway login

# In your project root
railway init

# Deploy
railway up
```

Then set environment variables in Railway dashboard.

