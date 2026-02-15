// src/screens/student/mypage/Certificates.style.ts
import { StyleSheet } from "react-native";
import { tokens } from "../../../theme/common.Style";

export const styles = StyleSheet.create({
    screen: { backgroundColor: "#F0F6FF", },

    // header
    header: { height: 74, paddingTop: 24, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between",},
    headerTitle: { fontSize: 16, fontWeight: "700", color: tokens.colors.ink, fontFamily: tokens.typography.fontFamily, },
    headerClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center", }, 
    headerIcon: { width: 24, height: 24, },

    // body
    body: { paddingTop: 39, paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1, },
    list: { gap: 19, },
    emptyWrap: { marginTop: 20, alignItems: "center", justifyContent: "center", gap: 10, },
    emptyText: { fontSize: 18, fontWeight: "700", color: tokens.colors.ink, fontFamily: tokens.typography.fontFamily, },

    card: { backgroundColor: "#fff", borderRadius: tokens.radius.r10, paddingVertical: 10, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 14,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 4, },
    thumb: { width: 60, height: 60, borderRadius: 5, backgroundColor: "#d9d9d9", overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0, },
    thumbImg: { width: "100%", height: "100%", }, 
    thumbPlaceholder: { width: "100%", height: "100%", backgroundColor: "#d9d9d9", },
    thumbPdf: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", },
    thumbPdfText: { fontSize: 12, fontWeight: "700", color: "#374151", fontFamily: tokens.typography.fontFamily, },
    
    info: { flex: 1, minWidth: 0, flexDirection: "column", gap: 5, },
    name: { fontSize: 16, fontWeight: "700", color: tokens.colors.ink, fontFamily: tokens.typography.fontFamily, },
    date: { height: 18, fontSize: 14, fontWeight: "500", color: "rgba(0,0,0,0.50)", fontFamily: tokens.typography.fontFamily, },
    actions: { alignItems: "center", justifyContent: "center", },
    iconBtn: { width: 31, height: 31, alignItems: "center", justifyContent: "center", },
    icon24: { width: 24, height: 24, },
});
