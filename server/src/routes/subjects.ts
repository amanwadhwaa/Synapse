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

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Subject name is required' });
    }

    // Check if subject already exists
    const existing = await prisma.subject.findFirst({
      where: {
        userId,
        name: name.trim(),
      },
    });

    if (existing) {
      return res.json(existing);
    }

    const subject = await prisma.subject.create({
      data: {
        userId,
        name: name.trim(),
        examDate: examDate ? new Date(examDate) : null,
        confidenceLevel: confidenceLevel || 3,
      },
    });
    res.json(subject);
  } catch (error) {
    console.error('Subject creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const subjectId = String(req.params.id);

    const existing = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        userId,
      },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    await prisma.subject.delete({
      where: {
        id: subjectId,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Subject delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;