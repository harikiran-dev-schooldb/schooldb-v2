import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

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
  const destination = storagePath(storageKey, collection);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await file.arrayBuffer()), {
    flag: "wx",
  });
  return storageKey;
}

export function readStudentDocument(storageKey: string) {
  return readFile(storagePath(storageKey));
}

export async function deleteStudentDocumentFile(storageKey: string) {
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
  return readFile(storagePath(storageKey, "admission-documents"));
}

export async function deleteAdmissionDocumentFile(storageKey: string) {
  try {
    await unlink(storagePath(storageKey, "admission-documents"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
