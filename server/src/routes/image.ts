import express from 'express';
import multer from 'multer';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Azure Computer Vision setup
const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({
    inHeader: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY || '',
    },
  }),
  process.env.AZURE_VISION_ENDPOINT || ''
);

router.post('/upload-image', authMiddleware, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const userId = req.user.id;
    const imageBuffer = req.file.buffer;

    // Call Azure Computer Vision OCR
    const result = await computerVisionClient.readInStream(imageBuffer, {
      language: 'en',
      readingOrder: 'natural',
    });

    let extractedText = '';

    // Wait for the operation to complete
    const operationLocation = result.operationLocation;
    if (operationLocation) {
      const operationId = operationLocation.split('/').pop();
      if (operationId) {
        let readResult;
        let attempts = 0;
        const maxAttempts = 10;

        do {
          await new Promise(resolve => setTimeout(resolve, 1000));
          readResult = await computerVisionClient.getReadResult(operationId);
          attempts++;
        } while (
          readResult.status !== 'succeeded' &&
          readResult.status !== 'failed' &&
          attempts < maxAttempts
        );

        if (readResult.status === 'succeeded') {
          for (const page of readResult.analyzeResult?.readResults || []) {
            for (const line of page.lines || []) {
              extractedText += line.text + '\n';
            }
          }
        }
      }
    }

    // Create note with extracted text
    const note = {
      id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      subjectId: req.body.subjectId || null,
      rawText: extractedText.trim() || 'No text could be extracted from this image.',
      extractedText: extractedText.trim(),
      sourceType: 'IMAGE',
      fileUrl: null, // In a real app, you'd upload the image to cloud storage
      createdAt: new Date(),
      title: 'Image Note',
    };

    // In a real app, you'd save to database
    // For now, we'll just return the extracted text

    res.json({
      note,
      extractedText: extractedText.trim() || 'No text could be extracted from this image.',
    });
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

export default router;