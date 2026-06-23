import { initializeApp, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ServiceAccount } from 'firebase-admin/app';

let app: App | null = null;

export function initFirebaseAdmin(): void {
  if (app) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId) {
    console.warn('[Firebase] FIREBASE_PROJECT_ID not set — skipping Firebase Admin init');
    return;
  }

  app = initializeApp({
    credential:
      clientEmail && privateKey
        ? cert({ projectId, clientEmail, privateKey } as ServiceAccount)
        : applicationDefault(),
  });

  console.log('[Firebase] Admin SDK initialized');
}

export function getFirebaseAuth() {
  return getAuth(app!);
}
