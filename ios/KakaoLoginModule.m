#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KakaoLogin, NSObject)

RCT_EXTERN_METHOD(login:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(loginWithTalk:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(loginWithAccount:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
