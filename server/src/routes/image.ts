import express from 'express';
import multer from 'multer';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { extractNotesFromImageBase64 } from '../services/noteVision';
import prisma from '../prisma';
import { uploadBufferToAzureBlob, deleteAzureBlobByUrl } from '../services/fileStorage';
import { moderateContent, logModerationRejection } from '../services/contentModeration';

const router = express.Router();

const resolveSubjectId = async ({
  userId,
  subjectId,
  subjectName,
}: {
  userId: string;
  subjectId?: string;
  subjectName?: string;
}) => {
  if (subjectId && subjectId.trim()) {
    const existingSubject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!existingSubject) {
      throw new Error('Invalid subject selected');
    }

    return existingSubject.id;
  }

  const trimmedSubjectName = subjectName?.trim();
  if (trimmedSubjectName) {
    const existingByName = await prisma.subject.findFirst({
      where: {
        userId,
        name: trimmedSubjectName,
      },
      select: {
        id: true,
      },
    });

    if (existingByName) {
      return existingByName.id;
    }

    const createdSubject = await prisma.subject.create({
      data: {
        userId,
        name: trimmedSubjectName,
      },
      select: {
        id: true,
      },
    });

    return createdSubject.id;
  }

  return null;
};

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

router.post('/upload-image', authMiddleware, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const incomingTitle = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    console.log('Image upload - received title:', incomingTitle, 'raw body:', req.body);
    if (!incomingTitle) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const resolvedSubjectId = await resolveSubjectId({
      userId: req.user!.id,
      subjectId: typeof req.body.subjectId === 'string' ? req.body.subjectId : undefined,
      subjectName: typeof req.body.subjectName === 'string' ? req.body.subjectName : undefined,
    });

    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/png';
    const extractedText = await extractNotesFromImageBase64({ base64, mimeType });
    const finalText = extractedText.trim() || 'No text could be extracted from this image.';
    const originalName = req.file.originalname || 'Uploaded Image';
    const fileUrl = await uploadBufferToAzureBlob({
      buffer: req.file.buffer,
      mimeType,
      userId: req.user!.id,
      originalFileName: originalName,
      folder: 'images',
    });

    // Moderate the extracted image content
    const moderationResult = await moderateContent(finalText);
    if (!moderationResult.safe) {
      logModerationRejection(req.user!.id, moderationResult.category, finalText);
      // Delete the uploaded blob since we're rejecting it
      try {
        await deleteAzureBlobByUrl(fileUrl);
      } catch (deleteError) {
        console.error('Failed to delete rejected image blob:', deleteError);
      }
      return res.status(400).json({
        error: 'CONTENT_REJECTED',
        message:
          'SYNAPSE was unable to process this image as it contains content that violates our community guidelines.',
        category: moderationResult.category,
      });
    }

    const note = await prisma.note.create({
      data: {
        userId: req.user!.id,
        title: incomingTitle,
        rawText: finalText,
        extractedText: finalText,
        sourceType: 'IMAGE',
        fileUrl,
        originalFileName: originalName,
        subjectId: resolvedSubjectId,
      },
      include: {
        subject: true,
      },
    });
    
    console.log('Created note:', { id: note.id, title: note.title, subjectId: note.subjectId, subject: note.subject });

    res.json({
      extractedText: finalText,
      note,
    });
  } catch (error) {
    console.error('OCR Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to process image: ${errorMessage}` });
  }
});

export default router;