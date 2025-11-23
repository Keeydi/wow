# Troubleshooting Guide

## Backend Server Connection Issues

### Error: "Cannot connect to the backend server at http://localhost:4000"

This error means the frontend cannot reach the backend server. Follow these steps:

### Step 1: Verify Backend Server is Running

1. Open a **new terminal window**
2. Navigate to the server directory:
   ```bash
   cd server
   ```
3. Start the backend server:
   ```bash
   npm run dev
   ```
4. You should see output like:
   ```
   HR Hub API listening on port 4000
   ✅ Database connected successfully
   ```

### Step 2: Check Environment Configuration

#### Frontend (.env in project root)
Make sure you have a `.env` file in the project root with:
```
VITE_API_URL=http://localhost:4000
```

**Important:** After creating or modifying `.env`, you must **restart the frontend dev server**.

#### Backend (server/.env)
Make sure you have a `.env` file in the `server` directory with:
```
PORT=4000
CLIENT_ORIGIN=http://localhost:5173,http://localhost:8080

# Database (Supabase) - REQUIRED
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Auth
JWT_SECRET=super-secret-key

# Email Configuration (optional, for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Step 3: Verify Database Connection

The backend requires Supabase configuration. If you see database connection errors:

1. Make sure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `server/.env`
2. Verify your Supabase project is active
3. Check that you've run the seed SQL file (`server/seed-postgresql.sql`) in your Supabase SQL Editor

### Step 4: Test Backend Health

Once the server is running, test it in your browser:
```
http://localhost:4000/health
```

You should see:
```json
{"status":"ok","timestamp":"..."}
```

### Step 5: Check Port Conflicts

If port 4000 is already in use:

1. Find what's using port 4000:
   ```powershell
   netstat -ano | findstr :4000
   ```
2. Either stop that process or change the port in `server/.env`:
   ```
   PORT=4001
   ```
3. Update frontend `.env` to match:
   ```
   VITE_API_URL=http://localhost:4001
   ```

### Common Issues

#### Issue: Server starts but immediately crashes
**Solution:** Check `server/.env` has all required Supabase credentials

#### Issue: "Database connection failed"
**Solution:** 
- Verify Supabase credentials in `server/.env`
- Make sure you've created the database tables (run `seed-postgresql.sql`)

#### Issue: CORS errors in browser console
**Solution:** 
- Add your frontend URL to `CLIENT_ORIGIN` in `server/.env`
- Restart the backend server

#### Issue: Frontend still can't connect after starting server
**Solution:**
1. Make sure both servers are running (frontend and backend)
2. Check that `.env` file exists in project root
3. Restart the frontend dev server after creating/modifying `.env`
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Quick Start Checklist

- [ ] Backend `.env` file exists in `server/` directory
- [ ] Frontend `.env` file exists in project root
- [ ] Supabase credentials are configured in `server/.env`
- [ ] Database tables are created (seed SQL executed)
- [ ] Backend server is running (`npm run dev` in server directory)
- [ ] Frontend server is running (`npm run dev` in project root)
- [ ] Health check works: http://localhost:4000/health

### Need More Help?

1. Check the server terminal for error messages
2. Check the browser console (F12) for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure both frontend and backend are using the same port configuration

