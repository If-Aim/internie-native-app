import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    topbarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop:11, paddingHorizontal: 12, paddingBottom: 15, backgroundColor: "#F0F6FF" },
    appTitle: { fontSize: 16, fontWeight: "700", color: "#000", lineHeight: 20 },
    list: { flex: 1 },
    content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 120 },
    loadingWrap: { minHeight: 360, alignItems: "center", justifyContent: "center" },
    
    card: { marginBottom: 38 },
    thumbnail: { width: "100%", height: 240, borderRadius: 20, overflow: "hidden", backgroundColor: "rgba(189, 216, 255, 0.50)" },
    thumbnailPressArea: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    thumbnailImage: { width: "100%", height: "100%" },
    thumbnailVideo: { width: "100%", height: "100%" },
    thumbnailLoadingOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 0, 0, 0.25)" },

    thumbnailEmpty: { alignItems: "center", justifyContent: "center", backgroundColor: "#DCEAFF" },
    thumbnailEmptyText: { fontSize: 16, fontWeight: "700", color: "#0166FF", lineHeight: 22 },

    videoControlBar: { position: "absolute", left: 30, right: 30, bottom: 12, zIndex: 4 },
    videoProgressTrack: { height: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.45)", overflow: "hidden" },
    videoProgressFill: { height: "100%", borderRadius: 2, backgroundColor: "#FFFFFF" },
    pauseIcon: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
    pauseBar: { width: 6, height: 24, marginHorizontal: 3, borderRadius: 2, backgroundColor: "#FFFFFF" },

    playTriangle: { width: 0, height: 0, marginLeft: 5, zIndex: 4, borderTopWidth: 14, borderBottomWidth: 14, borderLeftWidth: 22, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#FFFFFF" },
    playCircle: { position: "absolute", top: "50%", left: "50%", width: 64, height: 64, marginTop: -32, marginLeft: -32, borderRadius: 32, zIndex: 5, backgroundColor: "#BDD8FF", alignItems: "center", justifyContent: "center" },
    timeRow: { marginTop: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    timeText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", lineHeight: 20 },
    cardInfoRow: { marginTop: 18, flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 7, },
    cardTextWrap: { flex: 1, minWidth: 0 },
    cardTitle: { fontSize: 24, fontWeight: "700", color: "#000", lineHeight: 28 },
    cardDate: { marginTop: 8, fontSize: 16, fontWeight: "700", color: "#808080", lineHeight: 20 },
    
    progressBadge: { minWidth: 64, height: 36, marginLeft: 12, paddingHorizontal: 8, borderRadius: 18, backgroundColor: "#BDD8FF", alignItems: "center", justifyContent: "center" },
    progressText: { fontSize: 16, fontWeight: "700", color: "#0166FF", lineHeight: 30 },
    completedBadge: { minWidth: 64, height: 36, paddingHorizontal: 26, borderRadius: 31, backgroundColor: "#006BFF", alignItems: "center", justifyContent: "center", marginRight: 16 },
    completedText: { fontSize: 28, fontWeight: "900", color: "#FFFFFF", lineHeight: 36 },

    chevronIcon: { width: 28, height: 28, marginLeft: 10, resizeMode: "contain", tintColor: "#999999" },
    emptyWrap: { flex: 1, minHeight: 234, alignItems: "center", justifyContent: "center" },
    emptyImg: { width: 160, height: 160, marginBottom: 26 },
    emptyTitle: { fontSize: 16, fontWeight: "500", color: "#808080", textAlign: "center", lineHeight: 24 },
    addButton: { position: "absolute", left: 20, right: 20, bottom: 50, height: 60, borderRadius: 10, backgroundColor: "#0166FF", alignItems: "center", justifyContent: "center" },
    addButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", lineHeight: 36 },
});