# 🚀 Render Deployment Guide - Lab Management System

## Quick Deploy to Render

### Method 1: Automatic Deployment (Recommended)

1. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Lab Management System"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml` and set up everything

3. **Configure Environment Variables:**
   - Render will create a PostgreSQL database automatically
   - Copy the **External Database URL** from the database dashboard
   - Go to your web service → **Environment** tab
   - Set `DATABASE_URL` to your PostgreSQL connection string
   - `SESSION_SECRET` will be auto-generated

4. **Access your application:**
   - Your app will be available at: `https://lab-management-system.onrender.com`
   - Login with: **Username:** `KAROZH` / **Password:** `Karoj1996`

---

### Method 2: Manual Deployment

#### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → **New +** → **PostgreSQL**
2. Configure:
   - **Name:** `lab-management-db`
   - **Database:** `labmanagement`
   - **User:** `labadmin`
   - **Region:** Oregon (US West)
   - **Plan:** Free
3. Click **Create Database**
4. Copy the **External Database URL** (starts with `postgresql://`)

#### Step 2: Create Web Service

1. Go to Render Dashboard → **New +** → **Web Service**
2. Connect your GitHub repository (or use public Git URL)
3. Configure:
   - **Name:** `lab-management-system`
   - **Region:** Oregon (US West)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free

#### Step 3: Set Environment Variables

In your web service, go to **Environment** tab and add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `DATABASE_URL` | `postgresql://user:password@host:port/database` (from Step 1) |
| `SESSION_SECRET` | (Generate random string or let Render auto-generate) |

#### Step 4: Deploy

1. Click **Create Web Service**
2. Wait for build to complete (~3-5 minutes)
3. Your app will be live at: `https://your-service-name.onrender.com`

---

## 📋 Post-Deployment Setup

### Initialize Database Schema

Render will automatically run migrations on first deployment. If needed manually:

```bash
# From Render Shell (Web Service → Shell tab)
npm run db:push
```

### Initialize Default Tests (Optional)

After first login:
1. Go to **Settings** page
2. Click **"Add 68 Default Tests (Including Urine Analysis)"**
3. All medical tests will be added to the database

---

## ⚙️ Configuration Details

### Build Configuration

**Build Command:**
```bash
npm install && npm run build
```

This command:
1. Installs all dependencies
2. Builds the React frontend with Vite
3. Bundles the Express backend with esbuild
4. Outputs to `dist/` directory

**Start Command:**
```bash
npm start
```

Runs: `NODE_ENV=production node dist/index.js`

### Environment Variables Explained

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `SESSION_SECRET` | Secret key for session encryption | ✅ Yes |
| `NODE_ENV` | Set to `production` | ✅ Yes |
| `PORT` | Port number (Render uses 10000) | ✅ Yes |

### Health Check

- **Path:** `/api/session`
- **Expected:** 200 OK status
- **Checks:** Server is running and responding

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:** `Failed to connect to database`

**Solution:**
- Verify `DATABASE_URL` is correct
- Check database is running in Render dashboard
- Ensure External Database URL is used (not Internal)

#### 2. Build Failed

**Error:** `npm install` or `npm run build` fails

**Solution:**
```bash
# Check Node version (should be 18+)
node --version

# Clear cache and rebuild
npm cache clean --force
npm install
npm run build
```

#### 3. Session/Login Issues

**Error:** Can't login or session expires immediately

**Solution:**
- Check `SESSION_SECRET` is set
- Verify cookies are enabled in browser
- Check browser console for CORS errors

#### 4. Port Already in Use

**Error:** `EADDRINUSE: Port 10000 already in use`

**Solution:**
- Render automatically manages ports
- Ensure `PORT` environment variable is set to `10000`
- Don't hardcode port in code

---

## 🚀 Performance Optimization

### Free Tier Limitations

Render Free tier includes:
- **Web Service:** 750 hours/month, spins down after 15 min inactivity
- **PostgreSQL:** 90-day expiration, 1GB storage
- **No custom domains** on free tier

### Prevent Spin-Down (Optional)

Use a service like UptimeRobot to ping your app every 10 minutes:
- Monitor URL: `https://your-app.onrender.com/api/session`
- Interval: 10 minutes
- This keeps your app "warm"

### Upgrade to Paid Plan

For production use, consider:
- **Starter Plan ($7/mo):** No spin-down, custom domains
- **PostgreSQL Plan ($7/mo):** Persistent database, no expiration

---

## 📊 Monitoring & Logs

### View Logs

1. Go to Render Dashboard
2. Select your web service
3. Click **Logs** tab
4. View real-time logs

### Key Log Messages

```
✅ Database connection successful
✅ Server successfully started on port 10000
🚀 Starting server initialization...
```

### Monitor Performance

- **Dashboard → Metrics:** View CPU, memory, bandwidth
- **Events:** Track deployments and errors
- **Logs:** Debug runtime issues

---

## 🔒 Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` files
   - Use Render's environment variable management
   - Rotate `SESSION_SECRET` periodically

2. **Database:**
   - Use External Database URL (encrypted connection)
   - Enable SSL in production
   - Regular backups (paid plans)

3. **Access Control:**
   - Change default login credentials
   - Use strong passwords
   - Enable 2FA on Render account

---

## 📱 Access Your Application

### Default Login Credentials

- **Username:** `KAROZH`
- **Password:** `Karoj1996`

⚠️ **Important:** Change these credentials in production by modifying `/workspace/routes.ts`

### Application URL

After deployment, your app will be available at:
```
https://lab-management-system.onrender.com
```

Or your custom domain if configured.

---

## 🆘 Support & Resources

### Render Documentation
- [Render Docs](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)
- [PostgreSQL on Render](https://render.com/docs/databases)

### Application Support
- Check `SYSTEM_VERIFICATION.md` for features
- Review logs for errors
- Check environment variables

---

## ✅ Deployment Checklist

Before going live:

- [ ] Code pushed to GitHub
- [ ] PostgreSQL database created
- [ ] Web service created and linked to repo
- [ ] `DATABASE_URL` environment variable set
- [ ] `SESSION_SECRET` environment variable set
- [ ] Build completed successfully
- [ ] Application accessible via URL
- [ ] Login works with credentials
- [ ] Database schema initialized
- [ ] Default tests added (optional)
- [ ] Health check passing

---

## 🎉 You're Live!

Your Lab Management System is now running on Render!

**Next Steps:**
1. Login and test all features
2. Add medical tests via Settings
3. Start registering patients
4. Generate reports

**Production Ready:** ✅

For issues or questions, check the logs first, then refer to Render documentation.
