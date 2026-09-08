// Service worker Ruang Aman BK — TAHAP 6.
// Satu-satunya tugasnya: menerima push notification dari server dan
// menampilkannya, lalu membuka halaman tiket yang relevan kalau diklik.
// Tidak melakukan caching apa pun (bukan PWA offline-first — itu di luar
// cakupan TAHAP 6), jadi sengaja tetap sesederhana mungkin.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Ruang Aman BK", body: event.data.text() };
  }

  const title = payload.title || "Ruang Aman BK";
  const options = {
    body: payload.body || "",
    data: { url: payload.url || "/guru" },
    tag: "ruang-aman-bk-tiket",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/guru";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.indexOf(targetUrl) !== -1 && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
