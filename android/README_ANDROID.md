# Matcha Android WebView

This Android project loads the Railway web app in a WebView and adds:
- FCM token registration to backend.
- Native push notification handling.
- JS bridge to sync current user id from web app.

## Setup

1. Open `android/` in Android Studio.
2. Create/Edit `android/local.properties` and add:

```properties
sdk.dir=C\:\\Users\\YOUR_USER\\AppData\\Local\\Android\\Sdk
MATCHA_BASE_URL=https://YOUR-RAILWAY-APP.up.railway.app
```

3. Add Firebase file:
- Place `google-services.json` in `android/app/google-services.json`.

4. Sync Gradle and run app.

## Notes

- `MATCHA_BASE_URL` is also used as API URL.
- Backend must expose `/api/device/register`.
- For Android 13+, app asks notification permission at runtime.
