import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";

const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const MAX_STUDENT_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const STUDENT_DOCUMENT_ACCEPT = Object.keys(MIME_EXTENSIONS);

function storageRoot() {
  return (
    process.env.SCHOOLDB_PRIVATE_STORAGE_DIR ||
    path.join(/* turbopackIgnore: true */ process.cwd(), ".schooldb-storage")
  );
}

type PrivateDocumentCollection = "student-documents" | "admission-documents";

function hasBlobCredentials() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID),
  );
}

function isBlobStorageKey(storageKey: string) {
  try {
    return new URL(storageKey).protocol === "https:";
  } catch {
    return false;
  }
}

export function getPrivateStorageStatus() {
  const blobConfigured = hasBlobCredentials();
  return {
    provider: blobConfigured ? "Vercel Blob" : "Local disk",
    blobConfigured,
  };
}

function storagePath(
  storageKey: string,
  collection: PrivateDocumentCollection = "student-documents",
) {
  if (!/^[a-f0-9-]+\.(?:pdf|jpg|png|webp)$/.test(storageKey)) {
    throw new Error("Invalid private storage key");
  }
  const directory =
    collection === "admission-documents"
      ? path.join(storageRoot(), "admission-documents")
      : path.join(storageRoot(), "student-documents");
  return path.join(directory, storageKey);
}

export async function saveStudentDocument(file: File) {
  return savePrivateDocument(file, "student-documents");
}

async function savePrivateDocument(
  file: File,
  collection: PrivateDocumentCollection,
) {
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension)
    throw new Error("Only PDF, JPG, PNG, and WebP files are allowed");
  if (file.size <= 0 || file.size > MAX_STUDENT_DOCUMENT_BYTES) {
    throw new Error("Document must be smaller than 5 MB");
  }

  const storageKey = `${randomUUID()}${extension}`;

  if (hasBlobCredentials()) {
    const blob = await put(
      `${collection}/${storageKey}`,
      Buffer.from(await file.arrayBuffer()),
      {
        access: "private",
        addRandomSuffix: false,
        contentType: file.type,
        maximumSizeInBytes: MAX_STUDENT_DOCUMENT_BYTES,
      },
    );
    return blob.url;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Private cloud storage is not configured. Connect a Vercel Blob store before uploading documents.",
    );
  }

  const destination = storagePath(storageKey, collection);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await file.arrayBuffer()), {
    flag: "wx",
  });
  return storageKey;
}

async function readPrivateDocument(
  storageKey: string,
  collection: PrivateDocumentCollection,
) {
  if (isBlobStorageKey(storageKey)) {
    const result = await get(storageKey, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error("Stored document was not found.");
    }
    return Buffer.from(
      await new Response(result.stream as BodyInit).arrayBuffer(),
    );
  }
  return readFile(storagePath(storageKey, collection));
}

export function readStudentDocument(storageKey: string) {
  return readPrivateDocument(storageKey, "student-documents");
}

export async function deleteStudentDocumentFile(storageKey: string) {
  if (isBlobStorageKey(storageKey)) {
    await del(storageKey);
    return;
  }
  try {
    await unlink(storagePath(storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function saveAdmissionDocument(file: File) {
  return savePrivateDocument(file, "admission-documents");
}

export function readAdmissionDocument(storageKey: string) {
  return readPrivateDocument(storageKey, "admission-documents");
}

export async function deleteAdmissionDocumentFile(storageKey: string) {
  if (isBlobStorageKey(storageKey)) {
    await del(storageKey);
    return;
  }
  try {
    await unlink(storagePath(storageKey, "admission-documents"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
