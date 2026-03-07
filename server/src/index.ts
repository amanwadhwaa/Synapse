import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import prisma from './prisma';
import { router as authRoutes } from './routes/auth';
import notesRoutes from './routes/notes';
import subjectsRoutes from './routes/subjects';
import sessionsRoutes from './routes/sessions';

dotenv.config();

const app = express();
// const prisma = new PrismaClient({});

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
  credentials: true
}));
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/sessions', sessionsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});