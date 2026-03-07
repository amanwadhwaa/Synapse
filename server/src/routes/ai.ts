import express from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = express.Router();

// Mock AI responses - in a real app, you'd integrate with OpenAI, Claude, etc.
const mockSimplify = (text: string) => {
  // Simple mock - in reality, use AI API
  return `Simplified version: ${text.substring(0, 100)}... (This is a simplified explanation of the key concepts.)`;
};

const mockSummarize = (text: string) => {
  // Simple mock - in reality, use AI API
  return `Summary: This text covers ${text.length} characters of content. Key points include the main concepts discussed.`;
};

const mockGenerateQuiz = (text: string) => {
  // Simple mock - in reality, use AI API
  return `Quiz generated from the content:

1. What is the main topic discussed?
   a) Topic A
   b) Topic B
   c) Topic C
   d) Topic D

2. Which of the following is correct?
   a) Option A
   b) Option B
   c) Option C
   d) Option D

Answers: 1-a, 2-b`;
};

router.post('/simplify', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { noteId, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // In a real app, call AI service
    const result = mockSimplify(content);

    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to simplify content' });
  }
});

router.post('/summarize', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { noteId, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // In a real app, call AI service
    const result = mockSummarize(content);

    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to summarize content' });
  }
});

router.post('/generate-quiz', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { noteId, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // In a real app, call AI service
    const result = mockGenerateQuiz(content);

    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

export default router;