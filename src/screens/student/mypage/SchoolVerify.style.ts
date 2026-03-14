import { StyleSheet } from "react-native";
import { tokens } from "../../../theme/common.Style"

export const styles = StyleSheet.create({
    screen: { backgroundColor: tokens.colors.bg, },
    
    // Header
    headerLeftSpace: { width: 24, height: 24, }, 
	headerCenter: { paddingHorizontal: 40, },

    body: { flex: 1, paddingTop: 25, paddingHorizontal: 20, position: "relative", },
    title: { fontSize: 18, lineHeight: 40, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, textAlign: "center", },
    uploadTitle: { marginBottom: 149, fontSize: 18, lineHeight: 26, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, textAlign: "center", },
    doneTitle: { marginBottom: 149, fontSize: 18, lineHeight: 26, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, textAlign: "center", },
    
    searchWrap: { width: "100%", maxWidth: 520, position: "absolute", left: 20, right: 20, top: "50%", transform: [{ translateY: -30 }], alignSelf: "center", },
    input: { width: "100%", height: 61, borderRadius: 10, backgroundColor: "#fff", paddingLeft: 20, paddingRight: 44, fontSize: 18, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 4,}, 
    inputHasValue: { fontSize: 18, fontWeight: "700", color: tokens.colors.ink, },
    searchWrapOpen: { backgroundColor: "#fff", borderRadius: 10, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 4, },
    inputOpen: { color: "#707070", fontSize: 18, fontWeight: "600", borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, shadowOpacity: 0, elevation: 0, },

    rightIcon: { position: "absolute", right: 18, top: 16, width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 15, },
    rightIconCheck: { borderRadius: 999, backgroundColor: tokens.colors.primary, }, 
    rightIconImg: { width: 24, height: 24, resizeMode: "contain", }, 
    dropdown: { width: "100%", maxHeight: 150, backgroundColor: "#fff", borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingBottom: 14, },
    item: { width: "100%", height: 38, paddingVertical: 4, paddingHorizontal: 20, alignItems: "flex-start", justifyContent: "center", backgroundColor: "transparent", },
    itemText: { fontSize: 18, fontWeight: "600", lineHeight: 30, color: tokens.colors.ink, fontFamily: tokens.typography.fontFamily, },

    footer: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 53, },
    footerUpload: { flexDirection: "column", gap: 12 as any, },
    footerBtn: { width: "100%", }, 
    primaryBtn: { width: "100%", height: 60, borderRadius: 10, backgroundColor: "#0166FF", alignItems: "center", justifyContent: "center", },
    primaryBtnDisabled: { opacity: 0.5, },
    primaryBtnText: { color: "#fff", fontSize: 18, fontWeight: "700", fontFamily: tokens.typography.fontFamily, },

    secondaryBtn: { width: "100%", height: 54, borderRadius: 10, backgroundColor: "#BDD8FF", alignItems: "center", justifyContent: "center", },
    secondaryBtnText: { color: tokens.colors.ink, fontSize: 18, fontWeight: "700", fontFamily: tokens.typography.fontFamily, },

    primaryAltBtn: { width: "100%", height: 54, borderRadius: 10, backgroundColor: "#0166FF", alignItems: "center", justifyContent: "center", },
    cardPreview: { width: "100%", maxWidth: 520, alignItems: "center", justifyContent: "center", },
    previewGuide: { width: 292, height: 192, },
    cardPreviewText: { fontWeight: "500", fontSize: 14, lineHeight: 20, color: "#707070", textAlign: "center", paddingTop: 23, },

    errorText: { width: "100%", maxWidth: 520, marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "rgba(255, 0, 0, 0.08)", color: "rgba(160, 0, 0, 0.9)", fontSize: 13, fontFamily: tokens.typography.fontFamily, },
    doneBody: { paddingTop: 84, },
    doneBox: { width: "100%", maxWidth: 520, alignItems: "center", justifyContent: "center", marginTop: 34, },
    doneCard: { width: "100%", height: 170, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6, },
    doneCardText: { color: "rgba(0,0,0,0.35)", fontSize: 14, },
    doneImg: { width: "70%", height: 160, borderRadius: 16, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6, },

    hint: { fontWeight: "500", fontSize: 14, lineHeight: 20, color: "#707070", textAlign: "center", paddingTop: 23, },

    linkBtn: { paddingVertical: 6, alignSelf: "center", },
    linkText: { color: "rgba(0,0,0,0.6)", fontSize: 13, textDecorationLine: "underline", },
    submittingRow: { flexDirection: "row", alignItems: "center", gap: 10 as any, },

    submittedWrap: { flex: 1, alignItems: "center", justifyContent: "center", }, 
    submittedCenter: { alignItems: "center", justifyContent: "center", },
    checkCircle: { width: 50, height: 50, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: tokens.colors.primary, marginBottom: 6, },
    submittedCheckIcon: { width: 50, height: 50, resizeMode: "contain", },
    submittedTitle: { fontSize: 22, fontWeight: "700", lineHeight: 50, color: tokens.colors.primary, },
});
