package com.matcha.webview

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

object BackendApi {
    private val client = OkHttpClient()

    fun registerDeviceToken(apiBaseUrl: String, userId: String, token: String) {
        if (userId.isBlank() || token.isBlank()) return

        val safeBase = apiBaseUrl.removeSuffix("/")
        val payload = JSONObject()
            .put("userId", userId)
            .put("token", token)
            .put("platform", "android")
            .toString()

        val request = Request.Builder()
            .url("$safeBase/api/device/register")
            .post(payload.toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()

        client.newCall(request).enqueue(SimpleNoOpCallback)
    }
}
