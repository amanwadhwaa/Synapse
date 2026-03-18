# Synapse - Local Development Setup & Run Guide

## Prerequisites
- Node.js 18+ installed
- npm installed
- PostgreSQL (using Neon cloud database)

## Project Structure
```
Synapse/
├── prisma/              # Database schema and migrations
├── server/              # Express.js backend (TypeScript)
├── client/              # React frontend with Vite
└── shared/              # Shared TypeScript types and utilities
```

## Complete Setup Instructions

### Step 1: Install All Dependencies
From the root folder (`Synapse/`), run:

```bash
# Install root dependencies
npm install

# Install and build shared package
cd shared && npm install && npm run build && cd ..

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### Step 2: Generate Prisma Client
From the root folder, run:

```bash
npx prisma generate --schema=./prisma/schema.prisma
```

This generates the Prisma client in `server/src/generated/`.

### Step 3: Run Database Migrations
From the root folder, run:

```bash
npx prisma migrate dev --schema=./prisma/schema.prisma
```

If there are pending migrations, this will apply them to your database.

## Running the Application (Three Terminal Windows)

You need to run three separate processes simultaneously:

### Terminal 1: Start the Backend Server
```bash
cd server
npm run dev
```

Expected output:
```
Server running on port 3001
```

The API will be available at: `http://localhost:3001/api`

### Terminal 2: Start the Frontend Client
```bash
cd client
npm run dev
```

Expected output:
```
  VITE v7.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

The frontend will be available at: `http://localhost:5173/`

### Terminal 3: Optional - Watch Shared Package Changes
If you make changes to the shared package, run:

```bash
cd shared
npm run dev
```

This will watch for TypeScript changes and recompile automatically.

## Architecture & Configuration

### Server Configuration
- **Port**: 3001 (configured in `server/.env`)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon Cloud)
- **Environment**: `server/.env` contains API keys and database URL

### Client Configuration
- **Port**: 5173 (Vite default)
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **API Proxy**: Configured in `client/vite.config.ts` to forward `/api/*` to `http://localhost:3001`
- **Environment**: `client/.env` contains `VITE_API_URL=http://localhost:3001/api`

### Database
- **Provider**: PostgreSQL via Neon Cloud
- **URL**: Configured in `prisma/.env`
- **Schema**: Defined in `prisma/schema.prisma`
- **Migrations**: Located in `prisma/migrations/`

## Features

### Backend Features
- User authentication (JWT)
- Notes management with AI processing
- Quiz generation from notes
- Study sessions tracking
- Study plan generation
- Subject management
- Image recognition and processing
- Real-time AI chat with notes

### Frontend Features
- User registration and login
- Create/edit/delete notes
- Note categorization by subject
- AI-powered note simplification and summarization
- Quiz generation and attempt tracking
- Study session logging
- Dashboard with statistics
- Profile management
- Study plan viewing

## API Endpoints

All endpoints are prefixed with `/api`:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Notes
- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `POST /api/notes/:id/upload` - Upload note image

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create subject
- `PUT /api/subjects/:id` - Update subject

### Quizzes
- `GET /api/quizzes` - Get all quizzes
- `GET /api/quizzes/:id` - Get quiz details
- `POST /api/quizzes/:id/attempt` - Submit quiz attempt

### Sessions
- `GET /api/sessions` - Get study sessions
- `POST /api/sessions` - Log study session

### AI Features
- `POST /api/ai/simplify` - Simplify note content
- `POST /api/ai/summarize` - Summarize note content
- `POST /api/ai/generate-quiz` - Generate quiz from note
- `POST /api/ai/chat` - Chat with note content

## Environment Variables

### Server (`server/.env`)
```
DATABASE_URL=postgresql://...  # Neon database connection string
PORT=3001                       # Server port
JWT_SECRET=...                  # JWT secret key
GROQ_API_KEY=...               # For AI features
GEMINI_API_KEY=...             # For AI features
AZURE_*=...                     # Azure services credentials
```

### Client (`client/.env`)
```
VITE_API_URL=http://localhost:3001/api  # Backend API URL
```

### Prisma (`prisma/.env`)
```
DATABASE_URL=postgresql://...   # Same as server
```

## Troubleshooting

### Server Won't Start
1. Ensure port 3001 is not in use: `lsof -i :3001`
2. Check that `server/.env` has correct `DATABASE_URL` and `PORT`
3. Verify Prisma client is generated: `npx prisma generate --schema=./prisma/schema.prisma`

### Client Won't Start
1. Check that `client/.env` exists with `VITE_API_URL=http://localhost:3001/api`
2. Ensure shared package is built: `cd shared && npm run build`
3. Clear node_modules and reinstall: `cd client && rm -rf node_modules && npm install`

### API Calls Fail
1. Ensure server is running on port 3001
2. Check CORS configuration in `server/src/index.ts` allows localhost
3. Verify client is sending requests to correct URL (check browser Network tab)
4. Check JWT token in localStorage (DevTools > Application > Local Storage)

### Database Connection Issues
1. Verify `prisma/.env` has correct `DATABASE_URL`
2. Test connection: `npx prisma db push --schema=./prisma/schema.prisma`
3. Check Neon Cloud dashboard for connection status

## Building for Production

### Build Server
```bash
cd server
npm run build
npm start
```

### Build Client
```bash
cd client
npm run build
```

Output will be in `client/dist/`.

## Additional Commands

### Prisma Commands
```bash
# Open Prisma Studio (database visual editor)
npx prisma studio --schema=./prisma/schema.prisma

# Create a new migration
npx prisma migrate dev --name migration_name --schema=./prisma/schema.prisma

# Reset database (WARNING: deletes all data)
npx prisma migrate reset --schema=./prisma/schema.prisma
```

### Linting
```bash
cd client
npm run lint
```

## Port Summary
- **Backend Server**: http://localhost:3001
- **Frontend Client**: http://localhost:5173
- **API Calls**: http://localhost:3001/api (from client perspective)
- **Prisma Studio**: http://localhost:5555 (optional)

---

If you encounter any issues, check the browser console (F12) and server terminal for detailed error messages.
