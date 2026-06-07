import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "#F4F8FF" },
    content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 150 },
    backButton: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center", marginBottom: 34 },
    titleWrap: { marginBottom: 22 },
    subText: { marginBottom: 8, fontSize: 28, fontWeight: "800", color: "#7E7E7E", lineHeight: 36 },
    title: { fontSize: 42, fontWeight: "900", color: "#05070A", lineHeight: 52 },
    loadingWrap: { minHeight: 180, alignItems: "center", justifyContent: "center" },

    previewCard: { height: 478, marginBottom: 28, borderRadius: 18, backgroundColor: "#D5E7FF", overflow: "hidden" },
    previewProgressRow: { position: "absolute", top: 39, left: 48, right: 48, flexDirection: "row", gap: 12 },
    previewProgress: { flex: 1, height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.55)" },
    previewProgressActive: { backgroundColor: "#FFFFFF" },
    previewCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 42 },
    previewWeek: { marginTop: 56, fontSize: 28, fontWeight: "900", color: "#0F6EF7", lineHeight: 36 },
    previewTitle: { marginTop: 4, fontSize: 34, fontWeight: "900", color: "#05070A", lineHeight: 42 },
    previewTimeRow: { position: "absolute", left: 30, right: 30, bottom: 29, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    previewTime: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", lineHeight: 30 },

    clipList: { gap: 16 },
    clipCard: { height: 128, borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 14, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 20 },
    clipCardDisabled: { opacity: 0.42 },
    clipThumb: { width: 96, height: 96, borderRadius: 7, backgroundColor: "#E5E5E5", marginRight: 18 },
    clipTextWrap: { flex: 1, minWidth: 0 },
    clipTitle: { fontSize: 28, fontWeight: "900", color: "#05070A", lineHeight: 36 },
    clipWeek: { marginTop: 2, fontSize: 22, fontWeight: "700", color: "#7E7E7E", lineHeight: 28 },
    clipDuration: { width: 70, textAlign: "right", fontSize: 28, fontWeight: "900", color: "#7E7E7E", lineHeight: 36 },
    captionInput: { marginTop: 8, minHeight: 34, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#F4F4F4", fontSize: 16, fontWeight: "700", color: "#05070A" },

    dragHandle: { width: 46, alignItems: "flex-end", justifyContent: "center", marginLeft: 18 },
    addClipButton: { height: 116, borderRadius: 14, backgroundColor: "#E5E5E5", alignItems: "center", justifyContent: "center", marginTop: 6 },
    addClipText: { fontSize: 26, fontWeight: "900", color: "#8A8A8A", lineHeight: 34 },
    bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 28, backgroundColor: "rgba(244,248,255,0.94)" },
    exportButton: { height: 88, borderRadius: 12, backgroundColor: "#006BFF", alignItems: "center", justifyContent: "center" },
    exportButtonDisabled: { opacity: 0.6 },
    exportButtonText: { fontSize: 28, fontWeight: "900", color: "#FFFFFF", lineHeight: 36 },
});