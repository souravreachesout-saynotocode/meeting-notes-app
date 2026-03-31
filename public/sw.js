const CACHE_NAME = "meetscribe-v1";
const OFFLINE_URL = "/offline";

// Files to cache for offline use
const PRECACHE_URLS = [
  "/dashboard",
  "/record",
  "/search",
  "/icon.svg",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip API routes and auth
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Return cached version if offline
        return caches.match(event.request).then((cached) => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});

// Handle offline recording sync
self.addEventListener("message", (event) => {
  if (event.data?.type === "QUEUE_UPLOAD") {
    // Store in IndexedDB for later sync
    event.waitUntil(storeForSync(event.data.payload));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-recordings") {
    event.waitUntil(syncRecordings());
  }
});

async function storeForSync(data) {
  // Simple IndexedDB storage for offline recordings
  const db = await openDB();
  const tx = db.transaction("pending-uploads", "readwrite");
  tx.objectStore("pending-uploads").add(data);
}

async function syncRecordings() {
  const db = await openDB();
  const tx = db.transaction("pending-uploads", "readonly");
  const store = tx.objectStore("pending-uploads");
  const request = store.getAll();

  return new Promise((resolve) => {
    request.onsuccess = async () => {
      const items = request.result;
      for (const item of items) {
        try {
          await fetch("/api/meetings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });

          // Remove from pending
          const delTx = db.transaction("pending-uploads", "readwrite");
          delTx.objectStore("pending-uploads").delete(item.id);
        } catch {
          // Will retry on next sync
        }
      }
      resolve();
    };
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("meetscribe-offline", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("pending-uploads", { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
