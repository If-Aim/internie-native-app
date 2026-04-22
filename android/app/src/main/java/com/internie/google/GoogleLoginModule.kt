package com.internie.google

import android.app.Activity
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.internie.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID

class GoogleLoginModule(
    reactApplicationContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactApplicationContext) {

    override fun getName(): String = "GoogleLogin"

    @ReactMethod
    fun signIn(promise: Promise) {
        val activity: Activity = reactApplicationContext.currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "Activity is null")
            return
        }

        val serverClientId = reactApplicationContext.getString(R.string.google_web_client_id)
        val credentialManager = CredentialManager.create(activity)

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setServerClientId(serverClientId)
                    .setFilterByAuthorizedAccounts(false)
                    .setAutoSelectEnabled(false)
                    .setNonce(UUID.randomUUID().toString())
                    .build()

                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()

                val result = credentialManager.getCredential(
                    context = activity,
                    request = request
                )

                val credential = result.credential
                val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)

                val map = Arguments.createMap()
                map.putString("idToken", googleCredential.idToken)
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("GOOGLE_SIGN_IN_FAILED", e)
            }
        }
    }
}