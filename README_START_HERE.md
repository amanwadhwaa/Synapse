# 🎓 Synapse - Study Assistant Platform

Welcome! You're all set to run Synapse locally. Follow the instructions below to get started.

## ⚡ Quick Start (2 Minutes)

### Option A: Automated Setup (Recommended)
```bash
cd /path/to/Synapse
bash QUICK_START.sh
```

Then follow "Running the Application" section below.

### Option B: Manual Setup
```bash
# From the Synapse root folder
npm install
cd shared && npm install && npm run build && cd ..
cd server && npm install && cd ..
cd client && npm install && cd ..
npx prisma generate --schema=./prisma/schema.prisma
npx prisma migrate dev --schema=./prisma/schema.prisma
```

Then follow "Running the Application" section below.

## 🚀 Running the Application

You need **3 separate terminal windows** running simultaneously:

### Terminal 1: Start Backend Server
```bash
cd /path/to/Synapse/server
npm run dev
```
✓ Server will start on **http://localhost:3001**

### Terminal 2: Start Frontend Client
```bash
cd /path/to/Synapse/client
npm run dev
```
✓ Client will start on **http://localhost:5173**

### Terminal 3: Watch Shared Package (Optional)
```bash
cd /path/to/Synapse/shared
npm run dev
```
Only needed if you're modifying shared types.

## 🌐 Access the Application

Once both servers are running:
- **Frontend**: Open http://localhost:5173 in your browser
- **Backend API**: http://localhost:3001/api
- **Database UI**: http://localhost:5555 (run `npx prisma studio` from root)

## 📚 What's Included

### Features
- ✅ User authentication (register/login)
- ✅ Rich text note editor
- ✅ Note categorization by subject
- ✅ AI-powered note simplification & summarization
- ✅ Automatic quiz generation
- ✅ Study session tracking
- ✅ Performance analytics
- ✅ Image recognition (upload handwritten notes)
- ✅ Multi-language support
- ✅ Study planning with exam dates

### Tech Stack
- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Neon Cloud)
- **ORM**: Prisma
- **Styling**: TailwindCSS
- **State**: Zustand
- **AI**: Gemini API, GROQ API
- **Services**: Azure (Vision, Speech, Translation)

## 📖 Detailed Documentation

- **SETUP_AND_RUN.md** - Complete setup guide with troubleshooting
- **FIXES_APPLIED.md** - Issues fixed and current status
- **QUICK_START.sh** - Automated setup script

## 🔧 Configuration

All configuration is ready. Key files:
- `server/.env` - Backend environment variables (API keys, database)
- `client/.env` - Frontend environment variables
- `prisma/.env` - Database connection string
- `prisma/schema.prisma` - Database schema

## ✅ Verification Checklist

Before running, verify:
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] You're in the Synapse root directory
- [ ] All dependencies installed (after running setup)

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3001 is free
lsof -i :3001

# Regenerate Prisma client
npx prisma generate --schema=./prisma/schema.prisma
```

### Client won't start
```bash
# Verify environment
cat client/.env  # Should have VITE_API_URL=http://localhost:3001/api

# Rebuild shared package
cd shared && npm run build
```

### Can't reach API from client
1. Check both servers are running
2. Verify vite.config.ts has correct proxy: `'/api': 'http://localhost:3001'`
3. Check browser Network tab (F12) for failed requests
4. Verify JWT token in localStorage

### Database connection issues
```bash
# Test connection
npx prisma db push --schema=./prisma/schema.prisma

# View database
npx prisma studio --schema=./prisma/schema.prisma
```

## 📝 Project Structure

```
Synapse/
├── server/                 # Express backend
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── routes/        # API endpoints
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Auth, validation, etc.
│   │   ├── generated/     # Prisma Client (auto-generated)
│   │   └── prisma.ts      # Prisma setup
│   └── package.json
│
├── client/                 # React frontend
│   ├── src/
│   │   ├── main.tsx       # Entry point
│   │   ├── App.tsx        # Root component
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── services/      # API calls
│   │   ├── stores/        # Zustand stores
│   │   └── assets/        # Images, etc.
│   └── package.json
│
├── shared/                 # Shared types
│   ├── src/
│   │   ├── types.ts       # TypeScript types
│   │   └── index.ts
│   └── package.json
│
├── prisma/                 # Database setup
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Migration history
│   └── .env               # Database URL
│
├── package.json           # Root package
├── SETUP_AND_RUN.md      # Detailed setup guide
├── FIXES_APPLIED.md      # What was fixed
└── QUICK_START.sh        # Automated setup
```

## 🎯 Next Steps

1. **Run setup** (choose automated or manual)
2. **Start three servers** (follow "Running the Application" above)
3. **Open http://localhost:5173** in your browser
4. **Register an account**
5. **Start using Synapse!**

## 💡 Tips

- Use `npm run dev` for hot-reload development
- Run `npx prisma studio` to visually manage database
- Check `server/.env` for API keys and configuration
- Browser DevTools Network tab shows API requests
- Check server terminal for backend errors
- Keep `shared/npm run dev` running if editing types

## 🆘 Help

- Read SETUP_AND_RUN.md for detailed instructions
- Check server terminal for error messages
- Open browser DevTools (F12) > Network tab for API issues
- Verify environment variables in .env files

---

**Happy studying! 📚**

If you need help, check the SETUP_AND_RUN.md file for detailed troubleshooting steps.
