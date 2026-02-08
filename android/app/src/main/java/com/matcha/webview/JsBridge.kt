package com.matcha.webview

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface

class JsBridge(
    private val context: Context,
    private val onUserIdDetected: (String) -> Unit
) {
    private val mainHandler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun setUserId(userId: String?) {
        val safeUserId = userId?.trim().orEmpty()
        if (safeUserId.isBlank()) return
        mainHandler.post { onUserIdDetected(safeUserId) }
    }

    @JavascriptInterface
    fun notifyLocal(title: String?, body: String?) {
        val safeTitle = title?.ifBlank { "Matcha" } ?: "Matcha"
        val safeBody = body?.ifBlank { "Tenes una nueva notificacion" }
            ?: "Tenes una nueva notificacion"
        NotificationHelper.show(context, safeTitle, safeBody)
    }
}
