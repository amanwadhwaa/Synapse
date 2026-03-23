import { BlobServiceClient } from "@azure/storage-blob";
import { randomUUID } from "crypto";

const getBlobContainerClient = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER;

  if (!connectionString || !containerName) {
    throw new Error(
      "Azure Blob Storage is not configured. Missing AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_CONTAINER.",
    );
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  return blobServiceClient.getContainerClient(containerName);
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

export const uploadBufferToAzureBlob = async ({
  buffer,
  mimeType,
  userId,
  originalFileName,
  folder,
}: {
  buffer: Buffer;
  mimeType: string;
  userId: string;
  originalFileName: string;
  folder: "images" | "pdfs" | "audios";
}) => {
  const containerClient = getBlobContainerClient();
  await containerClient.createIfNotExists();

  const safeFileName = sanitizeFileName(originalFileName || "upload");
  const blobName = `${folder}/${userId}/${Date.now()}-${randomUUID()}-${safeFileName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
    },
  });

  return blockBlobClient.url;
};

export const deleteAzureBlobByUrl = async (blobUrl: string) => {
  const containerClient = getBlobContainerClient();

  const parsed = new URL(blobUrl);
  const segments = parsed.pathname.split("/").filter(Boolean);

  // URL format: /<container>/<blobName>
  if (segments.length < 2) {
    return;
  }

  const blobName = decodeURIComponent(segments.slice(1).join("/"));
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
};
