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
    path.join(process.cwd(), ".schooldb-storage")
  );
}

function storagePath(storageKey: string) {
  if (!/^[a-f0-9-]+\.(?:pdf|jpg|png|webp)$/.test(storageKey)) {
    throw new Error("Invalid private storage key");
  }
  return path.join(
    /* turbopackIgnore: true */ storageRoot(),
    "student-documents",
    storageKey,
  );
}

export async function saveStudentDocument(file: File) {
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) throw new Error("Only PDF, JPG, PNG, and WebP files are allowed");
  if (file.size <= 0 || file.size > MAX_STUDENT_DOCUMENT_BYTES) {
    throw new Error("Document must be smaller than 5 MB");
  }

  const storageKey = `${randomUUID()}${extension}`;
  const destination = storagePath(storageKey);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
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
