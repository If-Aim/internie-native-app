import { StyleSheet } from "react-native";
import { tokens } from "../../theme/common.Style";

export const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFFFFF" },
    flex: { flex: 1 },
    keyboard: { flex: 1 },
    content: { flex: 1, paddingTop: 78, paddingHorizontal: 27 },
    title: { marginHorizontal: 5, marginBottom: 15, fontSize: 24, fontWeight: "700", lineHeight: 24, color: tokens.colors.ink, fontFamily: tokens.typography.fontFamily, },
    field: { marginTop: 16 },
    alert: { marginTop: 13, marginLeft: 23, color: "#5F5F5F", fontSize: 18, fontWeight: "400", fontFamily: tokens.typography.fontFamily,},
    input: { width: "100%", height: 54, paddingHorizontal: 23, borderRadius: 10, borderWidth: 1, borderColor: "#E2E2E2", backgroundColor: "#FFFFFF", fontSize: 18, fontWeight: "400", color: "#000000", fontFamily: tokens.typography.fontFamily, },
    errorText: { marginTop: 12, marginHorizontal: 5, fontSize: 14, fontWeight: "400", color: "#E53935", fontFamily: tokens.typography.fontFamily, },

    footer: { paddingTop: 14, paddingHorizontal: 20, backgroundColor: "#FFFFFF", gap: 12 },
    primaryButton: { width: "100%", height: 60, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#0166FF" },
    primaryButtonDisabled: { backgroundColor: "#E3E3E3" },
    primaryButtonText: { fontSize: 18, fontWeight: "400", color: "#FFFFFF", fontFamily: tokens.typography.fontFamily, },
    primaryButtonTextDisabled: { color: "#707070", fontFamily: tokens.typography.fontFamily, },
    ghostButton: { width: "100%", height: 60, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#BDD8FF" },
    ghostButtonText: { fontSize: 18, fontWeight: "400", color: "#000000", fontFamily: tokens.typography.fontFamily, },

    jumpLogoWrap: { marginHorizontal: 5, marginBottom: 11, alignItems: "flex-start", justifyContent: "center" },
    jumpLogo: { width: 89, height: 30 },

    dropdownBox: { width: "100%", borderWidth: 1, borderColor: "#E2E2E2", borderRadius: 10, backgroundColor: "#FFFFFF", overflow: "hidden" },
    dropdownBoxOpen: { },
    dropdownTrigger: { width: "100%", height: 54, paddingLeft: 23, paddingRight: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    dropdownValue: { fontSize: 18, fontWeight: "500", color: "#000000", fontFamily: tokens.typography.fontFamily },
    dropdownPlaceholder: { color: "#9AA0A6", fontWeight: "400", fontFamily: tokens.typography.fontFamily },
    dropdownCaretWrap: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
    dropdownCaret: { width: 24, height: 24, transform: [{ rotate: "-90deg" }] },

    dropdownMenu: { borderTopWidth: 1, borderTopColor: "#E2E2E2", backgroundColor: "#FFFFFF", paddingVertical: 7 },
    dropdownList: { maxHeight: 147 },
    dropdownItem: { width: "100%", paddingVertical: 11, paddingHorizontal: 23 },
    dropdownItemActive: { backgroundColor: "#F5F7FB" },
    dropdownItemText: { fontSize: 18, fontWeight: "500", color: "#5F5F5F", fontFamily: tokens.typography.fontFamily },
    dropdownItemTextActive: { color: "#000000" },
    dropdownEmptyText: { paddingVertical: 11, paddingHorizontal: 23, fontSize: 18, fontWeight: "400", color: "#9AA0A6", fontFamily: tokens.typography.fontFamily },
});