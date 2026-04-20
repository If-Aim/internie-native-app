// src/navigation/AuthNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen"
import FindIdScreen from "../screens/auth/FindIdScreen"
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen"
export type AuthStackParamList = {
    Login: undefined;
    Signup: undefined;
    FindId: undefined;
    ResetPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="FindId" component={FindIdScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

        </Stack.Navigator>
    );
}