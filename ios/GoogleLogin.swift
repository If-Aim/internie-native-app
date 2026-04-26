import Foundation
import GoogleSignIn
import React
import UIKit

@objc(GoogleLogin)
class GoogleLogin: NSObject {
    @objc
    func signIn(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            guard let rootViewController = Self.getRootViewController() else {
                reject("NO_ROOT_VIEW_CONTROLLER", "Root view controller not found", nil)
                return
            }

            GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController) { result, error in
                if let error = error {
                    reject("GOOGLE_SIGN_IN_FAILED", error.localizedDescription, error)
                    return
                }

                guard let idToken = result?.user.idToken?.tokenString, !idToken.isEmpty else {
                    reject("GOOGLE_TOKEN_MISSING", "ID token not found", nil)
                    return
                }

                resolve(["idToken": idToken])
            }
        }
    }

    @objc
    func restorePreviousSignIn(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
            if let error = error {
                reject("GOOGLE_RESTORE_FAILED", error.localizedDescription, error)
                return
            }

            guard let idToken = user?.idToken?.tokenString, !idToken.isEmpty else {
                resolve(NSNull())
                return
            }

            resolve(["idToken": idToken])
        }
    }

    @objc
    func signOut(
        _ resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        GIDSignIn.sharedInstance.signOut()
        resolve(true)
    }

    private static func getRootViewController() -> UIViewController? {
        let scenes = UIApplication.shared.connectedScenes
        let windowScene = scenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
        let window = windowScene?.windows.first { $0.isKeyWindow }
        return window?.rootViewController
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
}
