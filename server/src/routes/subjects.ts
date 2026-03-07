import express from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import prisma from '../prisma';

const router = express.Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const subjects = await prisma.subject.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, examDate, confidenceLevel } = req.body;
    const userId = req.user.id;

    const subject = await prisma.subject.create({
      data: {
        userId,
        name,
        examDate: examDate ? new Date(examDate) : null,
        confidenceLevel: confidenceLevel || 3,
      },
    });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;