import express from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import prisma from '../prisma';

const router = express.Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { subjectId, durationMinutes, type } = req.body;
    const userId = req.user.id;

    const session = await prisma.studySession.create({
      data: {
        userId,
        subjectId,
        durationMinutes,
        type,
      },
    });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const sessions = await prisma.studySession.findMany({
      where: { userId },
      include: { subject: true },
      orderBy: { date: 'desc' },
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;