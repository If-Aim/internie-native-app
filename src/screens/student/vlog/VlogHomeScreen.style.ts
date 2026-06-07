import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    topbarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop:11, paddingHorizontal: 12, paddingBottom: 15, backgroundColor: "#F0F6FF" },
    appTitle: { fontSize: 16, fontWeight: "700", color: "#000", lineHeight: 20 },
    list: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
    loadingWrap: { minHeight: 360, alignItems: "center", justifyContent: "center" },
    card: { marginBottom: 18 },
    thumbnail: { width: "100%", aspectRatio: 1.48, borderRadius: 20, overflow: "hidden", backgroundColor: "rgba(189, 216, 255, 0.50)", alignItems: "center", justifyContent: "center" },
    playCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#BDD8FF", alignItems: "center", justifyContent: "center" },
    playTriangle: { width: 0, height: 0, marginLeft: 5, borderTopWidth: 14, borderBottomWidth: 14, borderLeftWidth: 22, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#FFFFFF" },
    timeRow: { position: "absolute", left: 30, right: 30, bottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    timeText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", lineHeight: 20 },
    cardInfoRow: { marginTop: 24, flexDirection: "row", alignItems: "flex-start" },
    cardTextWrap: { flex: 1, minWidth: 0 },
    cardTitle: { fontSize: 24, fontWeight: "700", color: "#000", lineHeight: 36 },
    cardDate: { marginTop: 8, fontSize: 16, fontWeight: "700", color: "#808080", lineHeight: 20 },
    
    progressBadge: { minWidth: 64, height: 36, marginLeft: 12, paddingHorizontal: 8, borderRadius: 18, backgroundColor: "#BDD8FF", alignItems: "center", justifyContent: "center" },
    progressText: { fontSize: 16, fontWeight: "700", color: "#0166FF", lineHeight: 30 },
    completedBadge: { minWidth: 64, height: 36, paddingHorizontal: 26, borderRadius: 31, backgroundColor: "#006BFF", alignItems: "center", justifyContent: "center", marginRight: 16 },
    completedText: { fontSize: 28, fontWeight: "900", color: "#FFFFFF", lineHeight: 36 },

    chevronIcon: { width: 28, height: 28, marginLeft: 10, resizeMode: "contain", tintColor: "#999999" },
    emptyWrap: { minHeight: 420, alignItems: "center", justifyContent: "center" },
    emptyImg: { width: 160, height: 160, marginBottom: 26 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: "#808080", textAlign: "center", lineHeight: 24 },
    addButton: { position: "absolute", left: 20, right: 20, bottom: 50, height: 60, borderRadius: 10, backgroundColor: "#0166FF", alignItems: "center", justifyContent: "center" },
    addButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", lineHeight: 36 },
});