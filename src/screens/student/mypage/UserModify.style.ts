// src/screens/student/mypage/UserModify.style.ts
import { StyleSheet } from "react-native";
import { tokens } from "../../../theme/common.Style"

export const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F0F6FF", }, 
    scroll:{ flex: 1, },
    headerLeftSpace: { width: 24, height: 24, }, 

    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", },
    headerTitle: { fontSize: 18, fontWeight: "700",  fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, },
    headerClose: { position: "absolute", right: 10, top: 8, width: 40, height: 40, alignItems: "center", justifyContent: "center", },
    headerCloseIcon: { width: 24, height: 24, },
    
    body: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, },
    top: { alignItems: "center", gap: 18 as any, },
    
    avatarWrap: { width: 120, height: 120, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: "#DFDFDF", alignItems: "center", justifyContent: "center", },
    avatarBtn: { minWidth: 60, height: 44, paddingHorizontal: 22, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: "#E3E3E3", },
    avatarBtnDisabled: { opacity: 0.6, },
    avatarBtnText: { fontSize: 18, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: "#707070", },
    profileImg: { width: 102, height: 102, borderRadius: 999, }, 
    
    form: { paddingHorizontal: 12, marginTop: 28, gap: 30 as any, },
    field: { gap: 10 as any, },
    label: { marginLeft: 19, fontSize: 18, fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, }, 
    input: { height: 60, paddingHorizontal: 19, borderRadius: 10, borderWidth: 1, borderColor: "#DFDFDF", fontFamily: tokens.typography.fontFamily, backgroundColor: "#fff", fontSize: 18, fontWeight: "500", color: "rgba(0,0,0,0.5)", },
    inputReadonly: { backgroundColor: "rgba(255,255,255,0.7)", color: "#9AA3AF", }, 

    bottom: { paddingBottom: 53, },
    saveBtn: { height: 60, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#0166FF", },
    saveBtnDisabled: { backgroundColor: "#F1F1F1", }, 
    saveBtnText: { fontSize: 18, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: "#fff", },
    saveBtnTextDisabled: { color: "#A2A2A2", },

    errorText: { marginTop: 8, marginLeft: 12, fontSize: 14, fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, },
    profileEditSaveDisabled: { backgroundColor: "#F1F1F1", },
    profileEditSaveText: { fontSize: 16, fontFamily: tokens.typography.fontFamily, color: "#fff",},

    /* verification code */
    verifyScreen: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 50 },
    verifyHeader: { backgroundColor: "#fff",}, 
    verifyField: { marginLeft: 12, gap: 32 },
    verifyInput: { height: 54, paddingHorizontal: 23, borderRadius: 10, borderWidth: 1, borderColor: "#DFDFDF", fontFamily: tokens.typography.fontFamily, backgroundColor: "#fff", fontSize: 18, fontWeight: "500", color: "#5F5F5F", },
    verifyInputFilled: { color: "#000" },
    verifyLabel: { fontSize: 24, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink },
    verifyBottom: { marginTop: "auto", marginBottom: 53, zIndex: 1, elevation: 1,},
    verifyErrorText: { marginTop: 8, marginLeft: 12, fontSize: 14, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink },

    jumpCenterSection: { marginTop: 20, marginLeft: 12, zIndex: 100, elevation: 100, },
    jumpLogoWrap: { marginHorizontal: 5, marginBottom: 8, alignItems: "flex-start" },
    jumpLogo: { width: 84, height: 30 },
    jumpCenterTitle: { marginHorizontal: 5, marginBottom: 32, fontSize: 24, fontWeight: "700", lineHeight: 20, fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink },

    helperText: { marginTop: 8, marginLeft: 12, fontSize: 14, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink },
    selectBox: { width: "100%", minHeight: 54, paddingLeft: 23, paddingRight: 13, borderWidth: 1, borderColor: "#E2E2E2", borderRadius: 10, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    selectBoxOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },

    selectBoxText: { fontSize: 18, fontWeight: "500", fontFamily: tokens.typography.fontFamily, color: "#5F5F5F" },
    selectPlaceholderText: { fontSize: 18, fontWeight: "400", fontFamily: tokens.typography.fontFamily, color: "#9AA0A6" },
    selectChevron: { width: 24, height: 24, transform: [{ rotate: "-90deg" }] },

    verifySaveBtnDisabled: { backgroundColor: "#F1F1F1" },
    verifySaveBtnText: { fontSize: 18, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: "#FFFFFF" },
    verifySaveBtnTextDisabled: { fontSize: 18, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: "#A2A2A2" },

    dropdownWrap: { position: "relative", width: "100%", zIndex: 200, elevation: 200, },
    dropdownMenu: { width: "100%", maxHeight: 240, borderWidth: 1, borderTopWidth: 0, borderColor: "#E2E2E2", borderBottomRightRadius: 14, borderBottomLeftRadius: 14, borderTopLeftRadius: 0, borderTopRightRadius: 0, backgroundColor: "#FFFFFF", overflow: "hidden", },
    dropdownMenuScroll: { flexGrow: 0, },
    dropdownMenuScrollContent: { paddingVertical: 8 },
    dropdownItem: { width: "100%", minHeight: 48, paddingHorizontal: 23, justifyContent: "center", backgroundColor: "transparent" },
    dropdownItemActive: { backgroundColor: "#F5F7FB" },
    dropdownItemText: { fontSize: 18, fontWeight: "500", fontFamily: tokens.typography.fontFamily, color: "#5F5F5F" },
    selectChevronOpen: { transform: [{ rotate: "90deg" }] },
});
