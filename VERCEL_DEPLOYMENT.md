# Vercel Deployment Guide

This guide will help you deploy the frontend application to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your backend API server deployed and accessible (can be on a different platform)
3. Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare Your Repository

Ensure your code is pushed to your Git repository:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will auto-detect Vite configuration
5. Configure the following:

   **Build Settings:**
   - Framework Preset: Vite
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Install Command: `npm install` (auto-detected)

   **Environment Variables:**
   - `VITE_API_URL`: Your backend API URL (e.g., `https://api.yourdomain.com`)

6. Click "Deploy"

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

## Step 3: Configure Environment Variables

After deployment, configure environment variables in Vercel:

1. Go to your project dashboard on Vercel
2. Navigate to Settings → Environment Variables
3. Add the following variable:

   **Variable Name:** `VITE_API_URL`
   **Value:** Your backend API URL (e.g., `https://api.yourdomain.com` or `https://your-backend.herokuapp.com`)

4. **Important:** After adding environment variables, you must redeploy:
   - Go to Deployments tab
   - Click the three dots on the latest deployment
   - Select "Redeploy"

## Step 4: Verify Deployment

1. Visit your Vercel deployment URL
2. Check the browser console for any errors
3. Test the application functionality
4. Verify API connections are working

## Important Notes

### Backend API Configuration

- Your backend server must be deployed separately (not on Vercel)
- Ensure your backend CORS settings allow requests from your Vercel domain
- Update `CLIENT_ORIGIN` in your backend `.env` to include your Vercel URL:
  ```
  CLIENT_ORIGIN=https://your-app.vercel.app,https://your-custom-domain.com
  ```

### Environment Variables

- All environment variables must be prefixed with `VITE_` to be accessible in the frontend
- Never commit `.env` files to Git
- Use Vercel's environment variables dashboard for all secrets

### Custom Domain

To add a custom domain:

1. Go to your project settings on Vercel
2. Navigate to Domains
3. Add your custom domain
4. Follow DNS configuration instructions

### Build Optimization

The project is configured with:
- Code splitting for better performance
- Asset optimization
- Production minification
- Proper caching headers

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility (Vercel uses Node 18+ by default)

### API Connection Errors

- Verify `VITE_API_URL` is set correctly in Vercel environment variables
- Check backend CORS settings
- Ensure backend is accessible from the internet
- Check browser console for specific error messages

### Routing Issues (404 on refresh)

- The `vercel.json` file includes rewrites for SPA routing
- If issues persist, verify `vercel.json` is in the root directory

### Environment Variables Not Working

- Ensure variables are prefixed with `VITE_`
- Redeploy after adding/changing environment variables
- Check that variables are set for the correct environment (Production, Preview, Development)

## Continuous Deployment

Vercel automatically deploys when you push to your connected Git branch:
- `main`/`master` branch → Production
- Other branches → Preview deployments

Each push creates a new preview deployment with a unique URL.

## Support

For Vercel-specific issues, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

