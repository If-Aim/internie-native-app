// src/auth/tokenStorage.ts
import * as Keychain from "react-native-keychain";

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
