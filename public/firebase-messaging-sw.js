// Firebase Cloud Messaging service worker.
// This file must be served from the site root.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// Config is injected via URL params from the client so we don't hardcode keys.
const urlParams = new URLSearchParams(self.location.search);
const config = {
  apiKey: urlParams.get("apiKey"),
  authDomain: urlParams.get("authDomain"),
  projectId: urlParams.get("projectId"),
  storageBucket: urlParams.get("storageBucket"),
  messagingSenderId: urlParams.get("messagingSenderId"),
  appId: urlParams.get("appId"),
};

// Fallback: in production, you can hardcode values here.
if (!config.apiKey) {
  config.apiKey = self.FIREBASE_API_KEY || "";
  config.authDomain = self.FIREBASE_AUTH_DOMAIN || "";
  config.projectId = self.FIREBASE_PROJECT_ID || "";
  config.storageBucket = self.FIREBASE_STORAGE_BUCKET || "";
  config.messagingSenderId = self.FIREBASE_MESSAGING_SENDER_ID || "";
  config.appId = self.FIREBASE_APP_ID || "";
}

firebase.initializeApp(config);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Warranty Vault";
  const link = payload.fcmOptions?.link || payload.data?.link || "/dashboard";
  const options = {
    body: payload.notification?.body || "",
    icon: "/icon.svg",
    data: { link },
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(new URL(link, self.location.origin).pathname) && "focus" in w) {
          return w.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
