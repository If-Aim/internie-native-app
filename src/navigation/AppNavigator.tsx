// src/navigation/AppNavigator.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavigationContainer, createNavigationContainerRef, type NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RemoteMessage } from "@react-native-firebase/messaging";

import AuthNavigator from "./AuthNavigator";
import StudentNavigator, { type StudentStackParamList } from "./StudentNavigator";
import OnboardingScreen from "../screens/auth/OnBoardingScreen";
import {
    getInitialPushNotification,
    subscribePushNotificationOpen,
    syncPushToken,
    subscribePushTokenRefresh,
} from "../notifications/pushNotification";
import { getAccessToken, clearAccessToken, getOnboardingCompleted } from "../auth/tokenStorage";
import { getUserMe, isOnboardingDone } from "../api/client";
import { markNotificationRead } from "../api/ea";

export type RootStackParamList = {
    Auth: undefined;
    Onboarding: undefined;
    Student: NavigatorScreenParams<StudentStackParamList> | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

type PushData = NonNullable<RemoteMessage["data"]>;

function getPushDataString(data: RemoteMessage["data"], key: string): string {
    const value = data?.[key];

    return typeof value === "string" ? value.trim() : "";
}

function isLeaderboardNotification(type: string, targetType: string): boolean {
    return (
        targetType.includes("LEADERBOARD") ||
        type === "LEADERBOARD_MISSION_APPROVED" ||
        type === "LEADERBOARD_MISSION_REJECTED"
    );
}

function isAssignmentNotification(type: string, targetType: string): boolean {
    return (
        targetType.includes("ASSIGNMENT") ||
        type === "ASSIGNMENT_CREATED" ||
        type === "ASSIGNMENT_EVALUATED"
    );
}

function isAttendanceNotification(type: string, targetType: string): boolean {
    return (
        targetType.includes("ATTENDANCE") ||
        type === "ATTENDANCE_CHECK_IN_OPENED"
    );
}

function markPushNotificationRead(data: RemoteMessage["data"]): void {
    const notificationId = getPushDataString(data, "notificationId");

    if (!notificationId) return;

    markNotificationRead(notificationId).catch((error) => {
        console.log("[PUSH] mark read failed:", error);
    });
}

export default function AppNavigator() {
    const [initialRouteName, setInitialRouteName] = useState<"Auth" | "Onboarding" | "Student" | null>(null);
    const pendingPushDataRef = useRef<PushData | null>(null);

    async function syncPushTokenSafely(): Promise<void> {
        await syncPushToken().catch((error) => {
            console.log("[PUSH] bootstrap sync failed:", error);
        });
    }

    const navigatePushNotificationTarget = useCallback((data: RemoteMessage["data"]): void => {
        if (!data) return;

        if (!navigationRef.isReady()) {
            pendingPushDataRef.current = data;
            return;
        }

        const externalActivityId = getPushDataString(data, "externalActivityId");
        const targetId = getPushDataString(data, "targetId");
        const type = getPushDataString(data, "type").toUpperCase();
        const targetType = getPushDataString(data, "targetType").toUpperCase();

        if (!externalActivityId) return;

        if (isLeaderboardNotification(type, targetType)) {
            navigationRef.navigate("Student", {
                screen: "EcaStudentLeaderboard",
                params: { externalActivityId },
            });
            return;
        }

        if (targetId && isAssignmentNotification(type, targetType)) {
            navigationRef.navigate("Student", {
                screen: "EcaStudentAssignmentSubmit",
                params: {
                    externalActivityId,
                    assignmentId: targetId,
                },
            });
            return;
        }

        if (targetId && isAttendanceNotification(type, targetType)) {
            navigationRef.navigate("Student", {
                screen: "EcaStudentMobileAttendanceSubmit",
                params: {
                    externalActivityId,
                    eventId: targetId,
                },
            });
            return;
        }

        navigationRef.navigate("Student", {
            screen: "EcaStudentDashboard",
            params: { externalActivityId },
        });
    }, []);

    const handlePushNotificationOpen = useCallback((remoteMessage: RemoteMessage): void => {
        markPushNotificationRead(remoteMessage.data);
        navigatePushNotificationTarget(remoteMessage.data);
    }, [navigatePushNotificationTarget]);

    function handleNavigationReady(): void {
        const pendingPushData = pendingPushDataRef.current;
        pendingPushDataRef.current = null;

        if (pendingPushData) {
            navigatePushNotificationTarget(pendingPushData);
        }
    }

    useEffect(() => {
        const unsubscribe = subscribePushTokenRefresh();

        return () => {
            unsubscribe();
        };
    }, []);
    
    useEffect(() => {
        const bootstrapAuth = async () => {
            try {
                const token = await getAccessToken();

                if (!token) {
                    setInitialRouteName("Student");
                    return;
                }

                syncPushTokenSafely();

                const onboardingCompleted = await getOnboardingCompleted();

                if (onboardingCompleted === true) {
                    setInitialRouteName("Student");
                    return;
                }

                if (onboardingCompleted === false) {
                    setInitialRouteName("Onboarding");
                    return;
                }

                const me = await getUserMe();

                if (isOnboardingDone(me)) {
                    setInitialRouteName("Student");
                } else {
                    setInitialRouteName("Onboarding");
                }
            } catch (error) {
                console.error("Failed to bootstrap auth:", error);
                await clearAccessToken().catch(() => {});
                setInitialRouteName("Student");
            }
        };

        bootstrapAuth();
    }, []);

    useEffect(() => {
        if (initialRouteName === null) return;

        const unsubscribe = subscribePushNotificationOpen(handlePushNotificationOpen);

        getInitialPushNotification()
            .then((remoteMessage) => {
                if (remoteMessage) {
                    handlePushNotificationOpen(remoteMessage);
                }
            })
            .catch((error) => {
                console.log("[PUSH] initial notification failed:", error);
            });

        return unsubscribe;
    }, [handlePushNotificationOpen, initialRouteName]);

    if (initialRouteName === null) {
        return null;
    }

    return (
        <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
                <Stack.Screen name="Auth" component={AuthNavigator} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="Student" component={StudentNavigator} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
