/**
 * Firebase Client SDK — HANYA untuk Firebase Authentication di browser.
 *
 * Sama seperti App A: semua operasi data (ganti nama/logo sekolah,
 * kelola akun Guru BK) WAJIB lewat Server Actions + Admin SDK (./admin.ts),
 * bukan lewat client Firestore/Storage. Client SDK di sini cuma dipakai
 * untuk login Super Admin (email/password).
 */
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const firebaseClientApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseClientApp);
export default firebaseClientApp;
