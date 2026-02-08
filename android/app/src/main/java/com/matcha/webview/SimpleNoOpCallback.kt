package com.matcha.webview

import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException

object SimpleNoOpCallback : Callback {
    override fun onFailure(call: Call, e: IOException) {
        // Intentionally ignored.
    }

    override fun onResponse(call: Call, response: Response) {
        response.close()
    }
}
