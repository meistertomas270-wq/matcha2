# Matcha

Matcha is a Tinder-style project ready for:
- Web deploy on Railway (Node.js + Express + web app).
- Android Studio WebView app (Kotlin).
- Push notifications on web (Web Push) and Android (Firebase FCM).
- PostgreSQL persistence for users, swipes, matches, and subscriptions.

## 1) What is included

- Swipe/like/pass flow with match detection.
- Mobile UI with 5 tabs: Swipe, Explorar, Likes, Chat, Perfil.
- Profile creation (guest mode).
- Match list UI.
- Likes summary with top picks.
- Chat list + chat messages per match.
- Web push notifications for browser users.
- Android WebView app with native notification handling.
- `.bat` script to publish to GitHub quickly.

## 2) Quick start (local)

Requirements:
- Node.js 20+
- npm
- PostgreSQL database

Set env vars (or `.env`):

```env
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_SSL=true
```

Install and run:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## 3) Railway deploy

1. Push this project to GitHub (you can use `subir_github.bat`).
2. In Railway, create a new project from that GitHub repo.
3. Add a PostgreSQL service in Railway and connect it to this app service.
4. Add environment variables in Railway:
- `DATABASE_URL` (usually auto-exposed by Railway Postgres reference)
- `DATABASE_SSL=true`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL` (example: `mailto:you@domain.com`)
- `FIREBASE_SERVICE_ACCOUNT` (optional, base64 JSON, only for Android remote push)
5. Deploy. Railway will run `npm start`.

Generate VAPID keys:

```bash
npm run gen:vapid
```

## 4) Android Studio (WebView app)

Project is in `android/`.

1. Open `android/` in Android Studio.
2. In `android/local.properties`, set:

```properties
MATCHA_BASE_URL=https://YOUR-RAILWAY-APP.up.railway.app
```

3. Add your Firebase `google-services.json` in:

```text
android/app/google-services.json
```

4. Build and run.

Notes:
- Android app loads your Railway URL in WebView.
- When a user logs in on web, app sends user id + FCM token to backend.
- Backend sends FCM notification when a match happens (if Firebase is configured).

## 5) Push notification behavior

- Browser users: receive Web Push through service worker.
- Android users: receive native push notifications via Firebase FCM.
- If Firebase is not configured, Android push is skipped, but web app still works.

## 6) GitHub upload with .bat

Run:

```bat
subir_github.bat
```

Or pass repo URL directly:

```bat
subir_github.bat https://github.com/your-user/your-repo.git
```

## 7) API summary

- `POST /api/auth/guest` -> create guest user.
- `GET /api/profiles/stack?userId=...` -> swipe deck.
- `POST /api/swipes` -> register like/pass and detect match.
- `GET /api/matches?userId=...` -> user matches.
- `GET /api/likes/summary?userId=...` -> likes count + preview + top picks.
- `GET /api/chats?userId=...` -> chat list.
- `GET /api/chats/:chatId/messages?userId=...` -> chat messages.
- `POST /api/chats/:chatId/messages` -> send message in chat.
- `GET /api/push/public-key` -> VAPID public key.
- `POST /api/push/subscribe` -> save web push subscription.
- `POST /api/device/register` -> save Android FCM token.

## 8) Important production notes

- Persistence is PostgreSQL-first. No file-based DB is used.
- Current auth is guest-mode (no passwords). Add secure auth for production.
- For Android remote push while app is closed, Firebase FCM is required.
