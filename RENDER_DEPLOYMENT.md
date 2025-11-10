# Render Deployment Guide

## Environment Variables Required

Set these in your Render dashboard:

1. **DATABASE_URL** - Your Neon PostgreSQL database connection string
   - Get this from your Neon dashboard
   - Format: `postgresql://user:password@host/database?sslmode=require`

2. **SESSION_SECRET** - Secret key for session management
   - Render can auto-generate this, or you can set a custom value
   - Should be a long random string

3. **NODE_ENV** - Set to `production` (already configured in render.yaml)

## Deployment Steps

1. Push your code to GitHub/GitLab/Bitbucket

2. Connect your repository to Render:
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your repository
   - Render will detect `render.yaml` automatically

3. Configure Environment Variables:
   - Go to your service settings
   - Add `DATABASE_URL` with your Neon database connection string
   - `SESSION_SECRET` will be auto-generated if not set

4. Deploy:
   - Render will automatically build and deploy
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

## Database Setup

Before deploying, make sure your Neon database is set up:

1. Create a Neon database at https://neon.tech
2. Get your connection string
3. Run migrations (if needed):
   ```bash
   npm run db:push
   ```

## Troubleshooting

- If build fails, check the build logs in Render dashboard
- Ensure all dependencies are listed in `package.json`
- Check that `DATABASE_URL` is correctly formatted
- Verify Node.js version compatibility (Render uses Node 18+ by default)
