import * as Keychain from "react-native-keychain";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "onboardingCompleted";
const SERVICE = "internie.auth";

export async function saveAccessToken(token: string): Promise<void> {
    await Keychain.setGenericPassword("accessToken", token, {
        service: SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
}

export async function getAccessToken(): Promise<string | null> {
    const res = await Keychain.getGenericPassword({ service: SERVICE });
    if (!res) return null;
    return res.password;
}

export async function clearAccessToken(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
}

export async function saveOnboardingCompleted(done: boolean): Promise<void> {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, done ? "true" : "false");
}

export async function getOnboardingCompleted(): Promise<boolean | null> {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);

    if (value === "true") return true;
    if (value === "false") return false;
    return null;
}

export async function clearOnboardingCompleted(): Promise<void> {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
}

export async function clearAuthStorage(): Promise<void> {
    await Promise.all([
        clearAccessToken(),
        clearOnboardingCompleted(),
    ]);
}