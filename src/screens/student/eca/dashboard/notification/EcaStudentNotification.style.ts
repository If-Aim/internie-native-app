import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: "#F0F6FF" },
    topbarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 11, paddingHorizontal: 12, paddingBottom: 15, backgroundColor: "#F0F6FF" },
    headerIconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, textAlign: "center", color: "#000000", fontSize: 16, fontWeight: "700" },
    content: { flex: 1, backgroundColor: "#F0F6FF" },
    contentContainer: { paddingTop: 36, paddingHorizontal: 20, paddingBottom: 32 },
    group: { marginBottom: 36 },
    groupTitle: { marginLeft: 8, marginBottom: 16, color: "#000000", fontSize: 14, fontWeight: "700", lineHeight: 18 },
    list: { gap: 8 },
    item: { width: "100%", minHeight: 48, padding: 16, borderRadius: 16, backgroundColor: "#FFFFFF" },
    itemRead: { opacity: 0.5 },
    itemText: { color: "#000000", fontSize: 12, fontWeight: "500", lineHeight: 20 },
    
    emptyWrap: { minHeight: 180, alignItems: "center", justifyContent: "center" },
    emptyText: { color: "#777777", fontSize: 14, fontWeight: "500", textAlign: "center", lineHeight: 20 },
    confirmBackdrop: { flex: 1, backgroundColor: "rgba(104, 104, 104, 0.50)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    confirmSheet: { width: "100%", padding: 20, borderRadius: 16, backgroundColor: "#FFFFFF" },
    confirmTitle: { color: "#000000", fontSize: 18, fontWeight: "700", lineHeight: 24, marginBottom: 8 },
    confirmMessage: { color: "#555555", fontSize: 14, fontWeight: "500", lineHeight: 20, marginBottom: 20 },
    confirmActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
    confirmCancelButton: { minWidth: 76, height: 42, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#E7E7E7", alignItems: "center", justifyContent: "center" },
    confirmDeleteButton: { minWidth: 76, height: 42, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#0166FF", alignItems: "center", justifyContent: "center" },
    confirmCancelText: { color: "#808080", fontSize: 14, fontWeight: "700" },
    confirmDeleteText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});