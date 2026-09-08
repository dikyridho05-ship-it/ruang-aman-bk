/**
 * Firebase Admin SDK — HANYA boleh diimpor dari kode sisi server
 * (Server Actions, Route Handlers, React Server Components).
 *
 * Paket "server-only" akan membuat build GAGAL kalau file ini sampai
 * ter-bundle ke kode client — pagar pengaman kalau ada yang tidak
 * sengaja mengimpornya dari komponen client.
 *
 * Kredensial di sini adalah Service Account: privilese admin penuh
 * yang BYPASS Firestore/Storage Security Rules. Karena itu file ini,
 * dan env var FIREBASE_ADMIN_*, tidak boleh pernah bocor ke browser.
 */
import "server-only";
import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function createFirebaseAdminApp(): App {
  // Cegah re-inisialisasi saat hot-reload di development / multiple imports.
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Di .env, newline private key tersimpan sebagai karakter literal "\n",
  // harus di-unescape jadi newline sungguhan sebelum dipakai.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Kredensial Firebase Admin belum lengkap. Cek FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL, dan FIREBASE_ADMIN_PRIVATE_KEY di .env.local " +
        "(lihat .env.local.example untuk formatnya)."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const firebaseAdminApp = createFirebaseAdminApp();

export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);
export const adminStorage = getStorage(firebaseAdminApp);
export default firebaseAdminApp;
