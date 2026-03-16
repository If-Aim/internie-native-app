// src/navigation/AppNavigator.tsx
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthNavigator from "./AuthNavigator";
import StudentNavigator from "./StudentNavigator";
import OnboardingScreen from "../screens/login/OnBoardingScreen";

import { getAccessToken, clearAccessToken, getOnboardingCompleted } from "../auth/tokenStorage";
import { getUserMe, isOnboardingDone } from "../api/client";

export type RootStackParamList = {
    Auth: undefined;
    Onboarding: undefined;
    Student: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const [initialRouteName, setInitialRouteName] = useState<"Auth" | "Onboarding" | "Student" | null>(null);

    useEffect(() => {
        const bootstrapAuth = async () => {
            try {
                const token = await getAccessToken();

                if (!token) {
                    setInitialRouteName("Auth");
                    return;
                }

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
                setInitialRouteName("Auth");
            }
        };

        bootstrapAuth();
    }, []);

    if (initialRouteName === null) {
        return null;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
                <Stack.Screen name="Auth" component={AuthNavigator} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="Student" component={StudentNavigator} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}