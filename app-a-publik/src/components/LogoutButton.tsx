"use client";

import { useFormStatus } from "react-dom";
import { logoutGuruAction } from "@/actions/auth";

/**
 * Tombol logout guru — menggunakan Server Action `logoutGuruAction`.
 * Dilengkapi loading state agar guru tahu proses sedang berlangsung
 * dan tidak mengklik berkali-kali saat koneksi lambat.
 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded text-sm font-medium text-brand-100 hover:text-white
        disabled:cursor-not-allowed disabled:opacity-50
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
    >
      {pending ? (
        <span className="flex items-center gap-1">
          <svg
            className="h-3 w-3 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Keluar…
        </span>
      ) : (
        "Keluar"
      )}
    </button>
  );
}

export default function LogoutButton() {
  return (
    <form action={logoutGuruAction}>
      <SubmitButton />
    </form>
  );
}
