// src/components/Screen.tsx
import React from "react";
import { View, ScrollView, StyleProp, ViewStyle, ScrollViewProps, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { commonStyles } from "../theme/common.Style"; 


// 스크롤 X
type ScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  safe?: boolean; 
};

export function Screen({ children, style, safe = true }: ScreenProps) { 
  const Container: any = safe ? SafeAreaView : View;

  return (
    <Container style={[commonStyles.screen, style]}>
      {children}
    </Container>
  );
}


// 스크롤 O
type ScrollScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  safe?: boolean;
} & Omit<ScrollViewProps, "contentContainerStyle">;

export function ScrollScreen({
  children,
  style,
  contentContainerStyle,
  safe = true,
  ...props
}: ScrollScreenProps) {
  const Container: any = safe ? SafeAreaView : View;

  return (
    <Container style={[commonStyles.screen, style]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentContainerStyle}
        {...props}
      >
        {children}
      </ScrollView>
    </Container>
  );
}
