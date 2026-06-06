"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let supportedCache: boolean | null = null;

function getClientApp(): FirebaseApp {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }
  app = initializeApp(firebaseConfig);
  return app;
}

async function getClientMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey) return null;
  if (supportedCache === null) supportedCache = await isSupported();
  if (!supportedCache) return null;
  if (messaging) return messaging;
  messaging = getMessaging(getClientApp());
  return messaging;
}

export type FcmStep =
  | "checking"
  | "permission"
  | "service-worker"
  | "token"
  | "saving"
  | "done";

export type FcmResult =
  | { ok: true; token: string }
  | {
      ok: false;
      code:
        | "unsupported"
        | "insecure-context"
        | "ios-needs-pwa"
        | "no-config"
        | "no-vapid-key"
        | "permission-denied"
        | "permission-dismissed"
        | "sw-failed"
        | "token-failed"
        | "save-failed";
      message: string;
      cause?: string;
    };

export async function checkPushSupport(): Promise<{
  supported: boolean;
  reason?: FcmResult & { ok: false };
}> {
  if (typeof window === "undefined") return { supported: false };
  if (!firebaseConfig.apiKey) {
    return {
      supported: false,
      reason: { ok: false, code: "no-config", message: "Firebase config is missing. Set NEXT_PUBLIC_FIREBASE_* env vars." },
    };
  }
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: { ok: false, code: "insecure-context", message: "Push requires HTTPS (or localhost)." },
    };
  }
  if (supportedCache === null) supportedCache = await isSupported();
  if (isIOSSafariNonPWA()) {
    return {
      supported: false,
      reason: {
        ok: false,
        code: "ios-needs-pwa",
        message: "iOS Safari needs the site installed: tap Share → Add to Home Screen, open it from the icon, then enable push.",
      },
    };
  }
  if (!supportedCache) {
    return {
      supported: false,
      reason: { ok: false, code: "unsupported", message: "This browser doesn't support web push." },
    };
  }
  return { supported: true };
}

export function currentPermission(): NotificationPermission | "unknown" {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unknown";
  return Notification.permission;
}

function isIOSSafariNonPWA(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") && typeof document !== "undefined" && "ontouchend" in document);
  if (!isIOS) return false;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  if (!isSafari) return false;
  const standalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return standalone !== true;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  const swQuery = new URLSearchParams({
    apiKey: firebaseConfig.apiKey ?? "",
    authDomain: firebaseConfig.authDomain ?? "",
    projectId: firebaseConfig.projectId ?? "",
    storageBucket: firebaseConfig.storageBucket ?? "",
    messagingSenderId: firebaseConfig.messagingSenderId ?? "",
    appId: firebaseConfig.appId ?? "",
  }).toString();
  const url = `/firebase-messaging-sw.js?${swQuery}`;
  const reg = await navigator.serviceWorker.register(url, { scope: "/" });
  if (reg.active) return reg;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Service worker activation timed out")), 15_000);
    const sw = reg.installing ?? reg.waiting ?? reg.active;
    if (!sw) {
      clearTimeout(timeout);
      return resolve();
    }
    const onChange = () => {
      if (sw.state === "activated") {
        clearTimeout(timeout);
        sw.removeEventListener("statechange", onChange);
        resolve();
      } else if (sw.state === "redundant") {
        clearTimeout(timeout);
        sw.removeEventListener("statechange", onChange);
        reject(new Error("Service worker became redundant before activating"));
      }
    };
    sw.addEventListener("statechange", onChange);
  });
  return reg;
}

export async function registerFcm(
  onStep?: (step: FcmStep, label: string) => void
): Promise<FcmResult> {
  onStep?.("checking", "Checking browser support…");
  const sup = await checkPushSupport();
  if (!sup.supported && sup.reason) return sup.reason;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    return { ok: false, code: "no-vapid-key", message: "NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set." };
  }

  onStep?.("permission", "Requesting notification permission…");
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch (e) {
    return {
      ok: false,
      code: "permission-denied",
      message: "Could not request notification permission.",
      cause: e instanceof Error ? e.message : String(e),
    };
  }
  if (permission === "denied") {
    return {
      ok: false,
      code: "permission-denied",
      message: "Notifications are blocked. Click the lock icon in your address bar → Notifications → Allow.",
    };
  }
  if (permission !== "granted") {
    return {
      ok: false,
      code: "permission-dismissed",
      message: "Permission prompt was dismissed. Click Enable push again.",
    };
  }

  onStep?.("service-worker", "Installing service worker…");
  let reg: ServiceWorkerRegistration;
  try {
    reg = await ensureServiceWorker();
  } catch (e) {
    return {
      ok: false,
      code: "sw-failed",
      message: "Could not install the messaging service worker.",
      cause: e instanceof Error ? e.message : String(e),
    };
  }

  onStep?.("token", "Generating push token…");
  const m = await getClientMessaging();
  if (!m) {
    return { ok: false, code: "unsupported", message: "Messaging is unavailable in this browser." };
  }
  let token: string | null = null;
  try {
    token = await getToken(m, { vapidKey, serviceWorkerRegistration: reg });
  } catch (e) {
    return {
      ok: false,
      code: "token-failed",
      message: "Firebase could not issue a push token. Check the VAPID key and Firebase config.",
      cause: e instanceof Error ? e.message : String(e),
    };
  }
  if (!token) {
    return { ok: false, code: "token-failed", message: "Firebase returned an empty token." };
  }

  onStep?.("saving", "Saving token to your account…");
  try {
    const res = await fetch("/api/fcm-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        code: "save-failed",
        message: `Server rejected token: ${data.error || res.statusText}`,
      };
    }
  } catch (e) {
    return {
      ok: false,
      code: "save-failed",
      message: "Could not reach the server to save the token.",
      cause: e instanceof Error ? e.message : String(e),
    };
  }

  onStep?.("done", "Push reminders enabled.");
  return { ok: true, token };
}

export function attachForegroundListener(
  handler: (payload: { title?: string; body?: string; link?: string }) => void
): () => void {
  let unsub: (() => void) | null = null;
  let cancelled = false;
  (async () => {
    const m = await getClientMessaging();
    if (!m || cancelled) return;
    unsub = onMessage(m, (payload) => {
      const link =
        (payload.fcmOptions?.link as string | undefined) ??
        (payload.data?.link as string | undefined);
      handler({
        title: payload.notification?.title,
        body: payload.notification?.body,
        link,
      });
    });
  })();
  return () => {
    cancelled = true;
    if (unsub) unsub();
  };
}
