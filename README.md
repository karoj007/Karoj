# 🏥 Medical Laboratory Management System

A complete, modern web application for managing medical laboratory operations including patient registration, test management, results entry, financial reporting, and more.

![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)
![Language](https://img.shields.io/badge/language-English-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### 🔐 Secure Authentication
- Session-based login system
- Protected routes and API endpoints
- Hardcoded credentials for quick deployment

### 🧪 Tests & Pricing Management
- Add unlimited medical tests
- Set units, normal ranges, and prices
- Global update of normal ranges
- 68 default tests available
- Special Urine Analysis interface

### 👥 Patient Registration
- Complete patient information capture
- Autocomplete test selection
- Automatic cost calculation
- Manual price adjustment
- Visit tracking

### 📊 Results Entry & Printing
- Modern, professional print layouts
- PDF export functionality
- Edit patient and test information
- Smart pagination for complex tests
- Customizable print sections
- Date filtering and search

### 💰 Financial Reports
- Income tracking by source/organization
- Expense management
- Net profit calculation
- Professional report printing
- Date-based filtering
- Optional information fields

### ⚙️ System Settings
- Dark/Light theme toggle
- Print customization (text, colors, positioning)
- Data management (clear, export, import)
- Initialize default tests
- Dashboard customization

### 🎨 Modern Dashboard
- Drag & drop sections
- Resizable widgets
- Custom colors and names
- Lock/unlock editing mode
- Responsive design

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or Neon serverless)
- npm or yarn

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/lab-management-system.git
   cd lab-management-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your database URL:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   SESSION_SECRET=your-secret-key-here
   NODE_ENV=development
   PORT=5000
   ```

4. **Run database migrations:**
   ```bash
   npm run db:push
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   ```
   http://localhost:5000
   ```

7. **Login with default credentials:**
   - Username: `KAROZH`
   - Password: `Karoj1996`

---

## 🌐 Deploy to Render

### One-Click Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Manual Deployment

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for complete step-by-step instructions.

**Quick Steps:**
1. Push code to GitHub
2. Create PostgreSQL database on Render
3. Create Web Service and link repository
4. Set environment variables
5. Deploy!

**Your app will be live at:** `https://your-app.onrender.com`

---

## 📖 Documentation

- **[System Verification](./SYSTEM_VERIFICATION.md)** - Complete feature list and verification report
- **[Render Deployment Guide](./RENDER_DEPLOYMENT.md)** - Detailed deployment instructions
- **[API Documentation](./API.md)** - REST API endpoints (coming soon)

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **TanStack Query** - Data fetching
- **Wouter** - Routing
- **React Grid Layout** - Drag & drop dashboard
- **Radix UI** - Accessible components

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Drizzle ORM** - Database ORM
- **Express Session** - Authentication

### Build Tools
- **Vite** - Frontend bundler
- **esbuild** - Backend bundler
- **TypeScript** - Type checking

---

## 📁 Project Structure

```
lab-management-system/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/          # Main application pages
│       └── lib/            # Utilities and helpers
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schemas
├── dist/                   # Production build
├── routes.ts              # API routes
├── storage.ts             # Database layer
├── db.ts                  # Database connection
├── index.ts               # Server entry point
├── vite.config.ts         # Vite configuration
├── package.json           # Dependencies
├── render.yaml            # Render deployment config
└── README.md              # This file
```

---

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload

# Production
npm run build        # Build frontend and backend
npm start            # Start production server

# Database
npm run db:push      # Push schema changes to database

# Type Checking
npm run check        # Run TypeScript type checking
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SESSION_SECRET` | Secret for session encryption | ✅ |
| `NODE_ENV` | Environment (development/production) | ✅ |
| `PORT` | Server port (default: 5000) | ✅ |

---

## 🎯 Usage

### First Time Setup

1. **Login** with credentials: `KAROZH` / `Karoj1996`
2. Go to **Settings** → **Data Management**
3. Click **"Add 68 Default Tests"** to initialize test database
4. Start using the system!

### Daily Workflow

1. **Register Patients** → Add patient info and select tests
2. **Enter Results** → Fill in test results for patients
3. **Print Results** → Generate professional PDF reports
4. **View Reports** → Track daily income and expenses
5. **Manage Tests** → Add/edit test prices and ranges

---

## 🔒 Security

- Session-based authentication
- Environment variable protection
- SQL injection prevention (Drizzle ORM)
- HTTPS support (on Render)
- Secure cookie handling

---

## 🌍 Language

**English Only** - The entire application interface, buttons, labels, and printed documents are in English.

---

## 📝 License

MIT License - See [LICENSE](./LICENSE) file for details

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

For issues and questions:
- Check [SYSTEM_VERIFICATION.md](./SYSTEM_VERIFICATION.md) for feature details
- Review [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for deployment help
- Open an issue on GitHub

---

## 🎉 Acknowledgments

Built with modern web technologies and best practices for medical laboratory management.

**Status:** ✅ Production Ready

---

**Made with ❤️ for medical laboratories worldwide**
