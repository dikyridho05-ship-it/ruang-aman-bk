import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Memverifikasi token widget Cloudflare Turnstile langsung ke server Cloudflare.
 * Token dari client TIDAK PERNAH dipercaya begitu saja — siapa pun bisa mengirim
 * form tanpa lewat widget kalau ini tidak dicek ulang di server.
 */
export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[verifyTurnstileToken] TURNSTILE_SECRET_KEY belum diisi di .env.local");
    return false;
  }

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });

    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[verifyTurnstileToken] gagal menghubungi Cloudflare:", err);
    return false;
  }
}
