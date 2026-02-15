// src/navigation/AppNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthNavigator from "./AuthNavigator";
import StudentNavigator from "./StudentNavigator";

export type RootStackParamList = {
  Auth: undefined;
  Student: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  // 개발 중 로그인 우회 플래그 (원하시면 env로 빼세요)
  const DEV_BYPASS_LOGIN = true;

  // TODO: 실제 로그인 상태로 교체
  const isLoggedIn = DEV_BYPASS_LOGIN ? true : false;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Student" component={StudentNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
