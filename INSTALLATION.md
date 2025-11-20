# Installation Guide

## Prerequisites

Install Node.js (version 18 or later) and MySQL on your system.

## Step 1: Install Frontend Dependencies

Open a terminal in the project root and run:

```
npm install
```

## Step 2: Install Backend Dependencies

Navigate to the server directory and install dependencies:

```
cd server
npm install
cd ..
```

## Step 3: Configure Frontend Environment

Copy the example environment file:

```
cp env.example .env
```

Edit the .env file and set:

```
VITE_API_URL=http://localhost:4000
```

## Step 4: Configure Backend Environment

Navigate to the server directory and copy the example environment file:

```
cd server
cp env.example .env
```

Edit server/.env and update with your MySQL credentials:

```
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hrm
JWT_SECRET=super-secret-key
```

## Step 5: Set Up Database

1. Make sure MySQL is running on your system
2. Create the database and seed initial data by running:

```
mysql -u root -p < server/seed.sql
```

Or manually open MySQL and execute the contents of server/seed.sql file.

This will create the hrm database and add a default admin account:
- Username: admin
- Password: admin123

## Step 6: Start the Application

Open two terminal windows.

In the first terminal, start the backend server:

```
cd server
npm run dev
```

The backend will run on http://localhost:4000

In the second terminal, start the frontend:

```
npm run dev
```

The frontend will run on http://localhost:5173

Open your browser and navigate to http://localhost:5173 to access the application.

## Troubleshooting

### Connection Refused Error (ERR_CONNECTION_REFUSED)

If you see an error like `ERR_CONNECTION_REFUSED` or `Failed to fetch` when trying to login, this means the frontend cannot connect to the backend server. Here's how to fix it:

#### 1. Check if Backend Server is Running

Make sure the backend server is running in a separate terminal:
```bash
cd server
npm run dev
```

You should see output indicating the server is listening on port 4000.

#### 2. Verify Environment Configuration

Ensure you have a `.env` file in the project root with the correct API URL:

**For local development:**
```
VITE_API_URL=http://localhost:4000
```

**If backend is on a different machine or port:**
```
VITE_API_URL=http://your-server-ip:4000
```

**Important:** After changing the `.env` file, you must restart the frontend development server for changes to take effect.

#### 3. Check Backend Server Port

Verify the backend is running on the correct port by checking `server/.env`:
```
PORT=4000
```

#### 4. Network/Firewall Issues

If the backend is on a different machine:
- Ensure both machines are on the same network
- Check firewall settings that might be blocking port 4000
- Verify the backend server's `CLIENT_ORIGIN` in `server/.env` allows connections from your frontend URL

#### 5. Verify Backend Health

Test if the backend is accessible by opening this URL in your browser:
```
http://localhost:4000/health
```

If this doesn't work, the backend server is not running or not accessible.

### Common Issues

**Issue:** "Cannot connect to the backend server" error appears
**Solution:** 
1. Make sure both frontend and backend servers are running
2. Check that `.env` file exists and has `VITE_API_URL` set correctly
3. Restart both servers after changing environment variables

**Issue:** Works on one machine but not another
**Solution:**
1. Ensure `.env` file is present on the machine where it's not working
2. Check that the backend server is running on that machine
3. If backend is on a different machine, update `VITE_API_URL` to point to the correct IP address

