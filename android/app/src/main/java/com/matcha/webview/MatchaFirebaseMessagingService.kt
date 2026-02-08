package com.matcha.webview

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MatchaFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        NotificationHelper.ensureChannel(applicationContext)

        val title =
            message.notification?.title
                ?: message.data["title"]
                ?: "Nuevo match en Matcha"
        val body =
            message.notification?.body
                ?: message.data["body"]
                ?: "Abrir la app para ver tu match."

        NotificationHelper.show(applicationContext, title, body)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        prefs.edit().putString(KEY_FCM_TOKEN, token).apply()

        val userId = prefs.getString(KEY_USER_ID, null)
        if (!userId.isNullOrBlank()) {
            BackendApi.registerDeviceToken(BuildConfig.MATCHA_API_URL, userId, token)
        }
    }

    companion object {
        private const val PREFS = "matcha_prefs"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_FCM_TOKEN = "fcm_token"
    }
}
