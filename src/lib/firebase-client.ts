import { getApps, initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseWebPushConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
);

export async function webMessaging() {
  if (!firebaseWebPushConfigured || !(await isSupported())) return null;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  return getMessaging(app);
}

export const firebaseVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
