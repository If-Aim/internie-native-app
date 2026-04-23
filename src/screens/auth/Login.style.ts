import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: "#F0F6FF" },
    scrollContent: { minHeight: "100%", paddingHorizontal: 37, paddingBottom: 40, alignItems: "center" },
    logoSection: { width: "100%", paddingTop: 96, alignItems: "center" },
    logoText: { fontSize: 32, lineHeight: 36, fontWeight: "700", color: "#000000", fontFamily: "Montserrat" },
    formSection: { width: "100%", marginTop: 82 },

    loginFieldGroup: { width: "100%", gap: 15 },

    input: { width: "100%", height: 48, paddingHorizontal: 20, borderWidth: 1, borderColor: "#DDD", borderRadius: 10, backgroundColor: "#FFFFFF", fontSize: 16, fontWeight: "500", color: "#6B6B6B", fontFamily: "Pretendard" },
    inputError: { borderColor: "#F00" },

    passwordWrap: { position: "relative", justifyContent: "center" },
    passwordInput: { paddingRight: 56 },
    passwordToggle: { position: "absolute", right: 12, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    passwordToggleIcon: { width: 24, height: 24, opacity: 0.58 },

    errorText: { minHeight: 20, marginLeft: 17, color: "#F00", fontSize: 12, fontWeight: "500", lineHeight: 20 },
    errorTextHidden: { opacity: 0 },
    errorTextVisible: { opacity: 1 },

    findAuthRow: { marginTop: 3, flexDirection: "row", alignItems: "center", justifyContent: "center", columnGap: 22 },
    findAuthBtn: { fontSize: 12, lineHeight: 20, fontWeight: "500", color: "#6B6B6B" },
    findAuthDivider: { width: 1, height: 12, backgroundColor: "#DDDDDD" },
    submitBtn: { width: "100%", height: 48, marginTop: 16, borderRadius: 10, backgroundColor: "#0166FF", alignItems: "center", justifyContent: "center" },
    submitBtnText: { fontSize: 16, lineHeight: 20, fontWeight: "700", color: "#FFFFFF" },
    socialSection: { width: "100%", marginTop: 74, rowGap: 15 },
    socialBtn: { width: "100%", height: 48, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 2, elevation: 4 },
    kakaoBtn: { backgroundColor: "#FEE500" },
    googleBtn: { backgroundColor: "#FFF", borderWidth: 0 },
    socialIconWrap: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
    socialIcon: { width: 20, height: 20 },
    socialText: { fontSize: 16, lineHeight: 20, fontWeight: "700", color: "#000000" },
    signupSection: { width: "100%", marginTop: 31, flexDirection: "row", justifyContent: "center", alignItems: "center", columnGap: 4 },
    signupText: { fontSize: 12, lineHeight: 22, fontWeight: "500", color: "#A2A2A2" },
    signupLink: { fontSize: 12, lineHeight: 22, fontWeight: "500", color: "#000000", textDecorationLine: "underline" },
});