// The SDK package does not always expose TypeScript declarations in all setups.
// Use runtime import to keep server compilation stable.
const speechSdk = require("microsoft-cognitiveservices-speech-sdk");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
import fs from "fs";
import { promises as fsp } from "fs";
import os from "os";
import path from "path";
import { getAzureSpeechLocale } from "./preferredLanguage";

ffmpeg.setFfmpegPath(ffmpegPath);

const TRANSCRIPTION_TIMEOUT_MS = 15_000;
const NO_SPEECH_ERROR_MESSAGE =
  "No speech detected. Please ensure your microphone is working and try speaking clearly. Background noise may affect detection.";

function extensionFromMimeType(mimeType?: string): string {
  if (!mimeType) {
    return ".webm";
  }

  if (mimeType.includes("wav")) {
    return ".wav";
  }

  if (mimeType.includes("ogg")) {
    return ".ogg";
  }

  return ".webm";
}

async function convertAudioToWavPcm16kMono(inputPath: string, outputWavPath: string) {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFrequency(16000)
      .audioChannels(1)
      .audioCodec("pcm_s16le")
      .format("wav")
      .on("end", () => resolve())
      .on("error", (error: unknown) => reject(error))
      .save(outputWavPath);
  });
}

export async function transcribeAudioBuffer({
  audioBuffer,
  preferredLanguage,
  mimeType,
  originalFileName,
}: {
  audioBuffer: Buffer;
  preferredLanguage?: string | null;
  mimeType?: string;
  originalFileName?: string;
}): Promise<string> {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;

  if (!speechKey || !speechRegion) {
    throw new Error("Azure Speech is not configured");
  }

  const locale = getAzureSpeechLocale(preferredLanguage);
  const speechConfig = speechSdk.SpeechConfig.fromSubscription(
    speechKey,
    speechRegion,
  );
  speechConfig.speechRecognitionLanguage = locale;

  const safeName =
    originalFileName && path.extname(originalFileName)
      ? path.extname(originalFileName)
      : extensionFromMimeType(mimeType);
  const tempBase = `synapse-audio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inputFilePath = path.join(os.tmpdir(), `${tempBase}${safeName}`);
  const outputWavPath = path.join(os.tmpdir(), `${tempBase}.wav`);

  await fsp.writeFile(inputFilePath, audioBuffer);
  await convertAudioToWavPcm16kMono(inputFilePath, outputWavPath);

  const audioConfig = speechSdk.AudioConfig.fromWavFileInput(
    fs.readFileSync(outputWavPath),
  );
  const recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);

  try {
    const result = await new Promise<any>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Speech transcription timed out"));
        }, TRANSCRIPTION_TIMEOUT_MS);

        recognizer.recognizeOnceAsync(
          (recognizeResult: any) => {
            clearTimeout(timeout);
            resolve(recognizeResult);
          },
          (recognizeError: unknown) => {
            clearTimeout(timeout);
            reject(recognizeError);
          },
        );
      },
    );

    console.log("Speech recognition reason:", result.reason);

    if (result.reason === speechSdk.ResultReason.RecognizedSpeech) {
      const text = (result.text || "").trim();
      if (!text) {
        throw new Error(NO_SPEECH_ERROR_MESSAGE);
      }
      return text;
    }

    if (result.reason === speechSdk.ResultReason.NoMatch) {
      const noMatchDetails = speechSdk.NoMatchDetails.fromResult(result);
      console.log("No match reason:", noMatchDetails?.reason);
      throw new Error(NO_SPEECH_ERROR_MESSAGE);
    }

    throw new Error("Unable to transcribe audio");
  } finally {
    recognizer.close();
    await Promise.allSettled([
      fsp.unlink(inputFilePath),
      fsp.unlink(outputWavPath),
    ]);
  }
}
