// src/screens/student/mypage/Certificates.style.ts
import { StyleSheet } from "react-native";
import { tokens } from "../../../theme/common.Style";

export const styles = StyleSheet.create({
    screen: { backgroundColor: "#F0F6FF", },
    // header
    headerTitle: { fontSize: 18, fontFamily: tokens.typography.fontFamily, fontWeight: "700", color: tokens.colors.ink,  },
    headerLeftSpace: { width: 24, height: 24, }, 

    // body
    body: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1, },
    list: { gap: 19, },
    emptyWrap: { marginTop: 20, alignItems: "center", justifyContent: "center", gap: 10, },
    emptyText: { fontSize: 18, fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink,  },

    card: { backgroundColor: "#fff", borderRadius: tokens.radius.r10, paddingVertical: 10, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 14,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 2, },
    thumb: { width: 60, height: 60, borderRadius: 5, backgroundColor: "#d9d9d9", overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0, },
    thumbImg: { width: "100%", height: "100%", }, 
    thumbPlaceholder: { width: "100%", height: "100%", backgroundColor: "#d9d9d9", },
    thumbPdf: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", },
    thumbPdfText: { fontSize: 12, fontFamily: tokens.typography.fontFamily, color: "#374151",  },
    
    info: { flex: 1, minWidth: 0, flexDirection: "column", gap: 5, },
    name: { fontSize: 18, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink,  },
    date: { height: 18, fontSize: 14, fontWeight: "500", fontFamily: tokens.typography.fontFamily, color: "rgba(0,0,0,0.50)",  },
    actions: { alignItems: "center", justifyContent: "center", },
    iconBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center", },
    icon24: { width: 24, height: 24, },
});
