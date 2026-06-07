import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    header: { height: 116, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F4F8FF" },
    backButton: { width: 52, height: 52, alignItems: "flex-start", justifyContent: "center" },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 30, fontWeight: "900", color: "#05070A", lineHeight: 38 },
    headerRight: { width: 52, height: 52 },
    list: { flex: 1, backgroundColor: "#F4F8FF" },
    content: { paddingHorizontal: 24, paddingBottom: 150 },
    columnWrapper: { gap: 10, marginBottom: 10 },
    clipTile: { flex: 1, aspectRatio: 1, borderRadius: 10, overflow: "hidden" },
    clipThumbnail: { flex: 1, backgroundColor: "#D5E7FF" },
    selectedBadge: { position: "absolute", right: 22, bottom: 22, width: 48, height: 48, borderRadius: 24, backgroundColor: "#006BFF", alignItems: "center", justifyContent: "center" },
    bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 40, paddingTop: 34, paddingBottom: 102, backgroundColor: "rgba(244,248,255,0.92)" },
    addButton: { height: 116, borderRadius: 12, backgroundColor: "#006BFF", alignItems: "center", justifyContent: "center" },
    addButtonText: { fontSize: 30, fontWeight: "900", color: "#FFFFFF", lineHeight: 38 },
});