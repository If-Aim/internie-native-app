// src/navigation/StudentNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import StudentHomeScreen from "../screens/student/HomeScreen";
import MyPageScreen from "../screens/student/mypage/MyPageScreen";
import SchoolVerifyScreen from "../screens/student/mypage/SchoolVerifyScreen";
import CertificatesScreen from "../screens/student/mypage/CertificatesScreen";
import TargetComScreen from "../screens/student/mypage/TargetComScreen";
import UserModifyScreen from "../screens/student/mypage/UserModifyScreen";
import VerifyCodeScreen from "../screens/student/mypage/VerifyCodeScreen";
import WithdrawScreen from "../screens/student/mypage/WithdrawScreen";
import QuestionsScreen from "../screens/student/questions/QuestionsScreen";
import NewScheduleScreen from "../screens/student/schedule/NewScheduleScreen";
import EditScheduleScreen from "../screens/student/schedule/EditScheduleScreen";
import DetailScheduleScreen from "../screens/student/schedule/DetailScheduleScreen";

export type StudentStackParamList = {
  StudentHome: undefined;
  MyPage: undefined;
  SchoolVerify: undefined;
  UserModify: undefined;
  VerifyCode: undefined;
  Certificates: undefined;
  TargetCom: undefined;
  Withdraw: undefined;
  NewSchedule: undefined;
  Questions: { eventDayId: number };
  EditSchedule: { eventId: number };
  DetailSchedule: { eventDayId: number };
};

const Stack = createNativeStackNavigator<StudentStackParamList>();

export default function StudentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
      <Stack.Screen name="MyPage" component={MyPageScreen} />
      <Stack.Screen name="SchoolVerify" component={SchoolVerifyScreen} />
      <Stack.Screen name="UserModify" component={UserModifyScreen} />
      <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
      <Stack.Screen name="Certificates" component={CertificatesScreen} />
      <Stack.Screen name="TargetCom" component={TargetComScreen} />
      <Stack.Screen name="Withdraw" component={WithdrawScreen} />
      <Stack.Screen name="Questions" component={QuestionsScreen} />
      <Stack.Screen name="NewSchedule" component={NewScheduleScreen} />
      <Stack.Screen name="EditSchedule" component={EditScheduleScreen} />
      <Stack.Screen name="DetailSchedule" component={DetailScheduleScreen} />
    </Stack.Navigator>
  );
}
