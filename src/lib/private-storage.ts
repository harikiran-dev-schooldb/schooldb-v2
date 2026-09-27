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

function detectedDocumentMime(buffer: Buffer): keyof typeof MIME_EXTENSIONS | null {
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export const MAX_STUDENT_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const STUDENT_DOCUMENT_ACCEPT = Object.keys(MIME_EXTENSIONS);

function storageRoot() {
  return (
    process.env.SCHOOLDB_PRIVATE_STORAGE_DIR ||
    path.join(/* turbopackIgnore: true */ process.cwd(), ".schooldb-storage")
  );
}

type PrivateDocumentCollection =
  | "student-documents"
  | "admission-documents"
  | "profile-image-requests";

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
  const directory = path.join(storageRoot(), collection);
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
  const contents = Buffer.from(await file.arrayBuffer());
  if (detectedDocumentMime(contents) !== file.type) {
    throw new Error("The document contents do not match the selected file type");
  }

  const storageKey = `${randomUUID()}${extension}`;

  if (hasBlobCredentials()) {
    const blob = await put(
      `${collection}/${storageKey}`,
      contents,
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
  await writeFile(destination, contents, {
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

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_ACCEPT = ["image/jpeg", "image/png", "image/webp"];

export async function validateProfileImageFile(file: File) {
  if (!PROFILE_IMAGE_ACCEPT.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WebP images are allowed");
  }
  if (file.size <= 0 || file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Profile image must be smaller than 5 MB");
  }
  const contents = Buffer.from(await file.arrayBuffer());
  if (detectedDocumentMime(contents) !== file.type) {
    throw new Error("The image contents do not match the selected file type");
  }
}

export async function savePendingProfileImage(file: File) {
  await validateProfileImageFile(file);
  return savePrivateDocument(file, "profile-image-requests");
}

export function readPendingProfileImage(storageKey: string) {
  return readPrivateDocument(storageKey, "profile-image-requests");
}

export async function deletePendingProfileImage(storageKey: string) {
  if (isBlobStorageKey(storageKey)) {
    await del(storageKey);
    return;
  }
  try {
    await unlink(storagePath(storageKey, "profile-image-requests"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function savePublicProfileImage(
  file: File,
  pathname: string,
) {
  await validateProfileImageFile(file);
  const extension = MIME_EXTENSIONS[file.type];
  const contents = Buffer.from(await file.arrayBuffer());
  if (!hasBlobCredentials()) {
    throw new Error("Vercel Blob is not configured for profile images");
  }
  const blob = await put(`${pathname}-${randomUUID()}${extension}`, contents, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
    maximumSizeInBytes: MAX_PROFILE_IMAGE_BYTES,
  });
  return blob.url;
}

export async function deletePublishedProfileImage(url: string | null) {
  if (!url || !isBlobStorageKey(url)) return;
  const hostname = new URL(url).hostname;
  if (!hostname.endsWith(".blob.vercel-storage.com")) return;
  await del(url);
}
