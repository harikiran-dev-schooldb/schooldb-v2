export type PwaOfflineSnapshot = {
  generatedAt: string;
  school: { slug: string; name: string };
  role: string;
  students: Array<Record<string, unknown>>;
  homework: Array<Record<string, unknown>>;
  timetable: Array<Record<string, unknown>>;
  attendance: Array<Record<string, unknown>>;
  notifications: Array<Record<string, unknown>>;
};

export type PwaQueuedAction = {
  id: string;
  ownerKey: string;
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body: Record<string, unknown>;
  createdAt: string;
};

const DATABASE_NAME = "schooldb-pwa";
const DATABASE_VERSION = 1;
const SNAPSHOTS = "snapshots";
const ACTIONS = "actions";
const ACTIVE_OWNER = "schooldb:pwa:active-owner";

export function rememberPwaOwner(ownerKey: string) {
  localStorage.setItem(ACTIVE_OWNER, ownerKey);
}

export function activePwaOwner() {
  return localStorage.getItem(ACTIVE_OWNER);
}

export function clearActivePwaOwner() {
  localStorage.removeItem(ACTIVE_OWNER);
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SNAPSHOTS)) database.createObjectStore(SNAPSHOTS);
      if (!database.objectStoreNames.contains(ACTIONS)) database.createObjectStore(ACTIONS, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePwaSnapshot(ownerKey: string, snapshot: PwaOfflineSnapshot) {
  const database = await openDatabase();
  await requestResult(database.transaction(SNAPSHOTS, "readwrite").objectStore(SNAPSHOTS).put(snapshot, ownerKey));
  database.close();
}

export async function readPwaSnapshot(ownerKey: string) {
  const database = await openDatabase();
  const snapshot = await requestResult(
    database.transaction(SNAPSHOTS).objectStore(SNAPSHOTS).get(ownerKey),
  ) as PwaOfflineSnapshot | undefined;
  database.close();
  return snapshot ?? null;
}

export async function deletePwaSnapshot(ownerKey: string) {
  const database = await openDatabase();
  await requestResult(database.transaction(SNAPSHOTS, "readwrite").objectStore(SNAPSHOTS).delete(ownerKey));
  database.close();
}

export async function queuePwaAction(action: PwaQueuedAction) {
  const database = await openDatabase();
  await requestResult(database.transaction(ACTIONS, "readwrite").objectStore(ACTIONS).put(action));
  database.close();
}

export async function listPwaActions(ownerKey: string) {
  const database = await openDatabase();
  const actions = await requestResult(
    database.transaction(ACTIONS).objectStore(ACTIONS).getAll(),
  ) as PwaQueuedAction[];
  database.close();
  return actions.filter((action) => action.ownerKey === ownerKey);
}

export async function flushPwaActions(ownerKey: string) {
  const actions = await listPwaActions(ownerKey);
  let completed = 0;
  for (const action of actions) {
    const response = await fetch(action.url, {
      method: action.method,
      headers: { "Content-Type": "application/json", "Idempotency-Key": action.id },
      body: JSON.stringify(action.body),
    });
    if (!response.ok) continue;
    const database = await openDatabase();
    await requestResult(database.transaction(ACTIONS, "readwrite").objectStore(ACTIONS).delete(action.id));
    database.close();
    completed += 1;
  }
  return { completed, remaining: actions.length - completed };
}
