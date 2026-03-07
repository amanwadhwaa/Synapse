import express from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = express.Router();

// Mock notes store
const notes: any[] = [
  {
    id: '1',
    userId: '1',
    subjectId: null,
    rawText: 'This is a sample note about Data Structures.\n\nKey concepts:\n- Arrays\n- Linked Lists\n- Trees\n- Graphs',
    extractedText: null,
    sourceType: 'TYPED',
    fileUrl: null,
    createdAt: new Date('2024-01-15'),
    title: 'Data Structures Overview',
  },
  {
    id: '2',
    userId: '1',
    subjectId: null,
    rawText: 'Machine Learning fundamentals:\n\n1. Supervised Learning\n2. Unsupervised Learning\n3. Neural Networks',
    extractedText: null,
    sourceType: 'TYPED',
    fileUrl: null,
    createdAt: new Date('2024-01-20'),
    title: 'ML Basics',
  },
];

router.post('/text', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, rawText, subjectId } = req.body;
    const userId = req.user.id;

    const note = {
      id: (notes.length + 1).toString(),
      userId,
      subjectId,
      rawText,
      extractedText: null,
      sourceType: 'TYPED',
      fileUrl: null,
      createdAt: new Date(),
      title: title || rawText.split('\n')[0] || 'Untitled Note',
    };
    notes.push(note);

    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const userNotes = notes.filter(n => n.userId === userId);
    res.json(userNotes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user.id;
    const note = notes.find(n => n.id === id && n.userId === userId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const index = notes.findIndex(n => n.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Note not found' });
    }
    notes.splice(index, 1);
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;