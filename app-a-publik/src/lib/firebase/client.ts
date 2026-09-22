/**
 * Firebase Client SDK — HANYA untuk Firebase Authentication di browser.
 *
 * Sengaja TIDAK mengekspor Firestore/Storage client di sini. Sesuai
 * keputusan arsitektur App A: semua baca/tulis data siswa & data curhat
 * WAJIB lewat Next.js Server Actions yang memakai Firebase Admin SDK
 * (lihat ./admin.ts), supaya Firestore Security Rules bisa dikunci total
 * dari akses publik (lihat /firebase/firestore.rules di root proyek).
 *
 * Client SDK ini dipakai untuk:
 *  - Guru BK login (email/password via signInWithEmailAndPassword), lalu
 *    ID token-nya diverifikasi di server lewat Admin SDK — termasuk cek
 *    bahwa UID-nya memang terdaftar sebagai Guru BK aktif (lihat
 *    lib/session/guru-session.ts).
 *  - Kirim tautan atur ulang password guru (sendPasswordResetEmail).
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

// getApps() check mencegah error "Firebase App named '[DEFAULT]' already exists"
// saat Next.js melakukan hot-reload di development.
const firebaseClientApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseClientApp);
export default firebaseClientApp;
