import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import KakaoSDKCommon
import KakaoSDKAuth
import GoogleSignIn

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    
    if let kakaoAppKey = Bundle.main.object(forInfoDictionaryKey: "KAKAO_APP_KEY") as? String {
        KakaoSDK.initSDK(appKey: kakaoAppKey)
    }

    if let googleClientID = Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String {
      let serverClientID = Bundle.main.object(forInfoDictionaryKey: "GIDServerClientID") as? String
      GIDSignIn.sharedInstance.configuration = GIDConfiguration(
        clientID: googleClientID,
        serverClientID: serverClientID
      )
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    
    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "internie",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
  
  func application(
      _ app: UIApplication,
      open url: URL,
      options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
      print("OPEN URL:", url.absoluteString)

      if GIDSignIn.sharedInstance.handle(url) {
          print("GOOGLE URL HANDLED")
          return true
      }

      if AuthApi.isKakaoTalkLoginUrl(url) {
          print("KAKAO URL DETECTED")
          return AuthController.handleOpenUrl(url: url)
      }

      print("RCT LINKING URL")
      return RCTLinkingManager.application(app, open: url, options: options)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
