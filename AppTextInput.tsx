import React from "react";
import { TextInput, TextInputProps, StyleSheet } from "react-native";

export default function AppTextInput({ style, ...props }: TextInputProps) {
    return <TextInput {...props} style={[styles.input, style]} />;
}

const styles = StyleSheet.create({
    input: {
        fontFamily: "Pretendard"
    }
});