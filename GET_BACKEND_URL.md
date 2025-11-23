# Where to Get Your Backend URL

## You Need to Deploy Backend First! 🚀

The backend URL is **generated after you deploy** your backend server. Here's where to find it:

---

## 🚂 Railway (Easiest)

1. **Deploy:**
   - Go to [railway.app](https://railway.app)
   - New Project → Deploy from GitHub
   - Select your repo
   - Set **Root Directory** to `server`
   - Add environment variables
   - Railway auto-deploys

2. **Get URL:**
   - Go to your project dashboard
   - Click on your service
   - Look for **"Public Domain"** or **"Generate Domain"**
   - Your URL will be: `https://your-app-name.railway.app`
   - **Copy this URL** - this is your backend URL!

---

## 🎨 Render

1. **Deploy:**
   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect GitHub repo
   - Set **Root Directory** to `server`
   - Add environment variables
   - Deploy

2. **Get URL:**
   - Go to your service dashboard
   - Look for **"URL"** at the top
   - Your URL will be: `https://your-app-name.onrender.com`
   - **Copy this URL** - this is your backend URL!

---

## 🪰 Fly.io

1. **Deploy:**
   ```bash
   cd server
   flyctl launch
   flyctl deploy
   ```

2. **Get URL:**
   ```bash
   flyctl status
   ```
   - Shows your app URL: `https://your-app-name.fly.dev`
   - **Copy this URL** - this is your backend URL!

---

## ✅ After You Get the URL

1. **Test it:**
   - Open in browser: `https://your-backend-url.com/health`
   - Should show: `{"status":"ok","timestamp":"..."}`

2. **Use in Vercel:**
   - Go to Vercel → Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-backend-url.com`
   - Redeploy

---

## 🎯 Quick Checklist

- [ ] Deploy backend on Railway/Render/Fly.io
- [ ] Get the public URL from the platform
- [ ] Test: `https://your-backend-url.com/health`
- [ ] Add `VITE_API_URL` in Vercel with that URL
- [ ] Redeploy Vercel

---

## 💡 Don't Have a Backend URL Yet?

**You need to deploy first!** The backend URL doesn't exist until you deploy.

**Recommended:** Use Railway (easiest):
1. Sign up at railway.app
2. Connect GitHub
3. Deploy your `server` folder
4. Get your URL
5. Done! ✅

