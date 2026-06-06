# Warranty Vault

Save warranty cards, let AI fill the form for you, get push reminders before expiry, and call brand support in one tap.

**Stack:** Next.js 16 (App Router) · Tailwind v4 · MongoDB (Mongoose) · NextAuth (Google OAuth) · Google Gemini (image understanding) · Firebase Cloud Messaging · AWS S3 · react-icons.

## Features

- **Sign in with Google** via NextAuth.
- **Upload warranty card** image. The image is sent to Google Gemini, which reads it and returns brand / product / phone / serial / dates. When the card only mentions a warranty period ("2 years", "6 months") it's converted into an expiry date — using the printed purchase date if present, otherwise today.
- **AWS S3** stores the original document; warranties keep an S3 URL + key.
- **Dashboard** with expiry badges (expired / soon / fine), per-item reminder toggle, one-tap **Call** button (`tel:` link).
- **Push reminders** at 30, 14, 7, 3, 1 day(s) before expiry via FCM. Click → opens warranty detail page with Yes / No prompt to continue reminders.
- **Cron route** at `/api/cron/remind?secret=...` for an external scheduler to invoke.

## Setup

```bash
cp .env.local.example .env.local   # fill in keys
npm install
npm run dev                        # http://localhost:3000
```

### Required services

1. **MongoDB** – local (`mongod`) or Atlas. Put the URI in `MONGODB_URI`.
2. **Google OAuth** – Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
3. **NextAuth secret** – `openssl rand -base64 32` → `NEXTAUTH_SECRET`.
4. **Firebase project**
   - Web app credentials → `NEXT_PUBLIC_FIREBASE_*`.
   - Cloud Messaging Web Push certificate → `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
   - Service account JSON → `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (keep the `\n` escapes).
5. **AWS S3**
   - Create a bucket (e.g. `warranty-vault`) in your chosen region.
   - Create an IAM user with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on the bucket; generate an access key pair.
   - Fill `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.
   - If the bucket is public or fronted by CloudFront, set `AWS_S3_PUBLIC_URL`. Otherwise the app serves 7-day signed URLs.
6. **Google Gemini** (required for the analyzer)
   - Get a free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey). Free tier ≈ 1500 requests/day on Flash.
   - Set `GEMINI_API_KEY`. Override the model via `GEMINI_MODEL` (default `gemini-2.5-flash`).

## Cron / scheduled reminders

`GET /api/cron/remind?secret=$CRON_SECRET` walks warranties expiring within 30 days and sends FCM pushes to users whose `remindersEnabled` is true and who have at least one FCM token.

Trigger it however you like:

- Cloudflare Cron Trigger → `curl https://your-app/api/cron/remind?secret=...`
- GitHub Actions schedule
- Vercel Cron
- A `node-cron` process

Reminders fire at exact day-deltas `[30, 14, 7, 3, 1]` and are de-duplicated by `lastReminderSentAt` (24h cooldown).

## Project layout

```
app/
  api/
    auth/[...nextauth]/    NextAuth handler
    cron/remind/           Reminder push dispatcher
    fcm-token/             Save/remove FCM device token
    analyze/               Send image → Gemini → structured fields
    upload/                File upload to AWS S3
    user/reminders/        Global reminders on/off
    warranties/            List, create, get, update, delete
  dashboard/               All warranties with badges + actions
  login/                   Google sign-in page
  upload/                  Upload + AI analysis + edit + save
  warranty/[id]/           Detail page (notification target)
components/Navbar.tsx
lib/
  auth.ts                  NextAuth options
  firebase-admin.ts        firebase-admin (server)
  firebase-client.ts       FCM client + service-worker registration
  mongodb.ts               Mongoose connection cache
  gemini.ts                Gemini image analyzer (vision + structured output)
  s3.ts                    AWS S3 (S3 SDK)
models/
  User.ts                  fcmTokens + remindersEnabled
  Warranty.ts              parsed fields + S3 refs
public/firebase-messaging-sw.js   Background notifications + click handler
```

## How push works

1. User clicks "Enable reminders" on `/dashboard`. The browser asks permission.
2. `lib/firebase-client.ts` registers `/firebase-messaging-sw.js` (with public config in query params) and requests an FCM token.
3. Token is POSTed to `/api/fcm-token` → stored on the user in MongoDB.
4. The cron route uses `firebase-admin` to `messaging.send({ token, notification, webpush.fcmOptions.link })`.
5. The service worker shows the notification. Click → `clients.openWindow(link)` opens `/warranty/<id>`.
6. The detail page shows a Yes / No prompt to continue reminders for that product.

## Notes

- Image uploads are JPEG/PNG/WebP/HEIC, ≤ 8 MB.
- The image is sent to the server for analysis (Gemini). It's only persisted to S3 when you click Save.
