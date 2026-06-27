import messaging, { type RemoteMessage } from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";
import { registerPushDeviceToken } from "../api/ea";

function getPushPlatform(): "ANDROID" | "IOS" | "UNKNOWN" {
    if (Platform.OS === "android") return "ANDROID";
    if (Platform.OS === "ios") return "IOS";
    return "UNKNOWN";
}

async function requestPushPermission(): Promise<void> {
    if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    if (Platform.OS === "ios") {
        await messaging().requestPermission();
    }
}

export async function syncPushToken(): Promise<void> {
    await requestPushPermission();

    const token = await messaging().getToken();

    if (!token) return;

    await registerPushDeviceToken({
        token,
        platform: getPushPlatform(),
    });
}

export function subscribePushTokenRefresh(): () => void {
    return messaging().onTokenRefresh(async (token) => {
        await registerPushDeviceToken({
            token,
            platform: getPushPlatform(),
        });
    });
}

export function subscribeForegroundPush(onReceive?: () => void): () => void {
    return messaging().onMessage(async (remoteMessage) => {
        console.log("foreground push", remoteMessage);
        onReceive?.();
    });
}

export function subscribePushNotificationOpen(onOpen: (remoteMessage: RemoteMessage) => void): () => void {
    return messaging().onNotificationOpenedApp((remoteMessage) => {
        onOpen(remoteMessage);
    });
}

export async function getInitialPushNotification(): Promise<RemoteMessage | null> {
    return messaging().getInitialNotification();
}
