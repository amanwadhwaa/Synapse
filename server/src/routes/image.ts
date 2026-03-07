import express from 'express';
import multer from 'multer';
import { AuthRequest, authMiddleware } from '../middleware/auth';

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

router.post('/upload-image', authMiddleware, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const userId = req.user.id;
    const imageBuffer = req.file.buffer;
    const apiKey = process.env.AZURE_VISION_KEY;
    const endpoint = process.env.AZURE_VISION_ENDPOINT;

    if (!apiKey || !endpoint) {
      console.error('Azure Vision credentials missing');
      return res.status(500).json({ error: 'Azure Vision API not configured' });
    }

    // Call Azure Computer Vision OCR using REST API
    const readUrl = `${endpoint}vision/v3.2/read/analyze`;

    const response = await fetch(readUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Vision API error:', response.status, errorText);
      return res.status(500).json({ 
        error: `Azure Vision API error: ${response.status}` 
      });
    }

    // Get the operation location to poll for results
    const operationLocation = response.headers.get('Operation-Location');
    if (!operationLocation) {
      console.error('No operation location returned from Azure Vision');
      return res.status(500).json({ error: 'Failed to process image: No operation location' });
    }

    // Poll for results
    let extractedText = '';
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const resultResponse = await fetch(operationLocation, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
        },
      });

      if (!resultResponse.ok) {
        const errorText = await resultResponse.text();
        console.error('Azure Vision poll error:', resultResponse.status, errorText);
        attempts++;
        continue;
      }

      const result = (await resultResponse.json()) as {
        status: string;
        analyzeResult?: {
          readResults: Array<{ lines: Array<{ text: string }> }>;
        };
      };

      if (result.status === 'succeeded') {
        // Extract text from results
        if (result.analyzeResult && result.analyzeResult.readResults) {
          for (const page of result.analyzeResult.readResults) {
            for (const line of page.lines) {
              extractedText += line.text + '\n';
            }
          }
        }
        break;
      } else if (result.status === 'failed') {
        console.error('Azure Vision processing failed');
        return res.status(500).json({ error: 'Image processing failed' });
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error('Azure Vision polling timeout');
      return res.status(500).json({ error: 'Image processing timed out' });
    }

    res.json({
      extractedText: extractedText.trim() || 'No text could be extracted from this image.',
    });
  } catch (error) {
    console.error('OCR Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to process image: ${errorMessage}` });
  }
});

export default router;