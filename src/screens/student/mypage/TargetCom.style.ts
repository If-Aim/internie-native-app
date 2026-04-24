import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: "#F0F6FF" },
    header: { paddingTop: 11, paddingHorizontal: 12, paddingBottom: 15,},
    headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#000000" },
    headerClose: { alignSelf: "flex-end" },
    content: { flexGrow: 1, paddingTop: 21, paddingRight: 22, paddingBottom: 0, paddingLeft: 32 },
    errorText: { marginBottom: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#FFFFFF", color: "#C62828", fontSize: 14 },
    section: { marginTop: 25 },
    label: { marginBottom: 10, fontSize: 16, fontWeight: "500", color: "#000000" },
    inputRow: { position: "relative" },
    input: { width: "100%", height: 56, borderRadius: 10, borderWidth: 1, borderColor: "#E2E2E2", backgroundColor: "#FFFFFF", paddingTop: 0, paddingRight: 23, paddingBottom: 0, paddingLeft: 20, fontSize: 16, fontWeight: "500", color: "#000000" },
    pencil: { position: "absolute", right: 14, top: 18, width: 20, height: 20 },
    footer: { paddingTop: 14, paddingRight: 20, paddingBottom: 53, paddingLeft: 20, marginTop: "auto" },
    saveBtn: { width: "100%", height: 60, borderRadius: 10, backgroundColor: "#0166FF", alignItems: "center", justifyContent: "center" },
    saveBtnDisabled: { backgroundColor: "#F1F1F1" },
    saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
    saveBtnTextDisabled: { color: "#A2A2A2" },
});