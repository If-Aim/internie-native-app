import * as Keychain from "react-native-keychain";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "onboardingCompleted";
const ACCESS_TOKEN_SERVICE = "internie.auth.access";
const REFRESH_TOKEN_SERVICE = "internie.auth.refresh";

export async function saveAccessToken(token: string): Promise<void> {
    await Keychain.setGenericPassword("accessToken", token, {
        service: ACCESS_TOKEN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
}

export async function getAccessToken(): Promise<string | null> {
    const res = await Keychain.getGenericPassword({
        service: ACCESS_TOKEN_SERVICE,
    });

    if (!res) return null;

    return res.password;
}

export async function clearAccessToken(): Promise<void> {
    await Keychain.resetGenericPassword({
        service: ACCESS_TOKEN_SERVICE,
    });
}

export async function saveRefreshToken(token: string): Promise<void> {
    await Keychain.setGenericPassword("refreshToken", token, {
        service: REFRESH_TOKEN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
}

export async function getRefreshToken(): Promise<string | null> {
    const res = await Keychain.getGenericPassword({
        service: REFRESH_TOKEN_SERVICE,
    });

    if (!res) return null;

    return res.password;
}

export async function clearRefreshToken(): Promise<void> {
    await Keychain.resetGenericPassword({
        service: REFRESH_TOKEN_SERVICE,
    });
}

export async function clearTokens(): Promise<void> {
    await Promise.all([
        clearAccessToken(),
        clearRefreshToken(),
    ]);
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
        clearTokens(),
        clearOnboardingCompleted(),
    ]);
}