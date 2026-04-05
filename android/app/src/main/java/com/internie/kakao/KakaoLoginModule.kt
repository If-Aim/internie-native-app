package com.internie.kakao

import com.facebook.react.bridge.*
import com.kakao.sdk.user.UserApiClient
import com.kakao.sdk.user.model.OAuthToken
import com.kakao.sdk.auth.LoginClientError
import com.kakao.sdk.common.model.ClientError
import com.kakao.sdk.common.model.ClientErrorCause
import com.kakao.sdk.user.LoginUiMode

class KakaoLoginModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "KakaoLogin"

    @ReactMethod
    fun login(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "현재 Activity를 찾을 수 없습니다.")
            return
        }

        UserApiClient.instance.loginWithKakao(activity, uiMode = LoginUiMode.AUTO) { token: OAuthToken?, error: Throwable? ->
            if (error != null) {
                promise.reject("KAKAO_LOGIN_ERROR", error)
                return@loginWithKakao
            }
            if (token == null) {
                promise.reject("KAKAO_LOGIN_ERROR", "토큰이 비어 있습니다.")
                return@loginWithKakao
            }

            val result = Arguments.createMap().apply {
                putString("accessToken", token.accessToken)
                putString("refreshToken", token.refreshToken)
                putDouble("accessTokenExpiresAt", token.accessTokenExpiresAt.time.toDouble())
                putDouble("refreshTokenExpiresAt", token.refreshTokenExpiresAt.time.toDouble())
            }
            promise.resolve(result)
        }
    }

    @ReactMethod
    fun loginWithTalk(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "현재 Activity를 찾을 수 없습니다.")
            return
        }

        UserApiClient.instance.loginWithKakaoTalk(activity) { token, error ->
            if (error != null) {
                promise.reject("KAKAO_TALK_LOGIN_ERROR", error)
                return@loginWithKakaoTalk
            }
            if (token == null) {
                promise.reject("KAKAO_TALK_LOGIN_ERROR", "토큰이 비어 있습니다.")
                return@loginWithKakaoTalk
            }

            val result = Arguments.createMap().apply {
                putString("accessToken", token.accessToken)
                putString("refreshToken", token.refreshToken)
            }
            promise.resolve(result)
        }
    }

    @ReactMethod
    fun loginWithAccount(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "현재 Activity를 찾을 수 없습니다.")
            return
        }

        UserApiClient.instance.loginWithKakaoAccount(activity) { token, error ->
            if (error != null) {
                promise.reject("KAKAO_ACCOUNT_LOGIN_ERROR", error)
                return@loginWithKakaoAccount
            }
            if (token == null) {
                promise.reject("KAKAO_ACCOUNT_LOGIN_ERROR", "토큰이 비어 있습니다.")
                return@loginWithKakaoAccount
            }

            val result = Arguments.createMap().apply {
                putString("accessToken", token.accessToken)
                putString("refreshToken", token.refreshToken)
            }
            promise.resolve(result)
        }
    }
}