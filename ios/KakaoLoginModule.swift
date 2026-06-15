import Foundation
import React
import KakaoSDKAuth
import KakaoSDKUser

@objc(KakaoLogin)
class KakaoLogin: NSObject {

    @objc
    func loginWithTalk(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            UserApi.shared.loginWithKakaoTalk { token, error in
                if let error = error as NSError? {
                    let message = "code: \(error.code), domain: \(error.domain), desc: \(error.localizedDescription), userInfo: \(error.userInfo)"
                    reject("KAKAO_TALK_LOGIN_ERROR", message, error)
                    return
                }

                guard let token = token else {
                    reject("KAKAO_TALK_LOGIN_ERROR", "토큰이 비어 있습니다.", nil)
                    return
                }

                resolve([
                    "accessToken": token.accessToken,
                    "refreshToken": token.refreshToken
                ])
            }
        }
    }

    @objc
    func loginWithAccount(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            UserApi.shared.loginWithKakaoAccount { token, error in
                if let error = error as NSError? {
                    let message = "code: \(error.code), domain: \(error.domain), desc: \(error.localizedDescription), userInfo: \(error.userInfo)"
                    reject("KAKAO_ACCOUNT_LOGIN_ERROR", message, error)
                    return
                }

                guard let token = token else {
                    reject("KAKAO_ACCOUNT_LOGIN_ERROR", "토큰이 비어 있습니다.", nil)
                    return
                }

                resolve([
                    "accessToken": token.accessToken,
                    "refreshToken": token.refreshToken
                ])
            }
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}