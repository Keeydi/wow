# Quick Copy & Paste - Environment Variables

## VERCEL (Frontend)

```
VITE_API_URL = https://your-backend-url.railway.app
```

**Steps:**
1. Go to Vercel → Settings → Environment Variables
2. Click "Add"
3. Name: `VITE_API_URL`
4. Value: `https://your-backend-url.railway.app` (replace with your actual backend URL)
5. Select all environments
6. Save & Redeploy

---

## BACKEND (Railway/Render/etc.)

```
PORT = 4000
CLIENT_ORIGIN = https://your-app.vercel.app,https://*.vercel.app
SUPABASE_URL = https://ovkytjxiaxlrdxkgqcch.supabase.co
SUPABASE_SERVICE_ROLE_KEY = (your-key-from-supabase)
JWT_SECRET = (any-strong-random-string-32-chars-min)
```

**Steps:**
1. Deploy backend on Railway/Render
2. Add these variables in the platform's environment settings
3. Replace `your-app.vercel.app` with your actual Vercel domain

---

## That's it! 🎉

