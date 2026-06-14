import { Dimensions, StyleSheet } from "react-native";

export const DRAWER_WIDTH = Math.round(Dimensions.get("window").width * 0.85);

export const sideMenuStyles = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, zIndex: 3000 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.08)" },
    panel: { position: "absolute", top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, backgroundColor: "#FFFFFF", shadowColor: "#383838", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 8 },
    safeArea: { flex: 1, backgroundColor: "#F0F6FF" },
    header: { paddingTop: 44, paddingRight: 19, paddingBottom: 13, paddingLeft: 31, backgroundColor: "#F0F6FF" },
    profileWrap: { flexDirection: "row", alignItems: "center" },
    profileImgBox: { width: 60, height: 60, marginRight: 15, borderRadius: 30, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3E3E3", padding: 5, alignItems: "center", justifyContent: "center" },
    profileImg: { width: "100%", height: "100%", borderRadius: 30 },
    profileInfo: { flex: 1, height: 60, paddingVertical: 7, justifyContent: "space-between" },
    profileName: { fontSize: 24, lineHeight: 28, fontWeight: "700", color: "#000000" },
    profileEmail: { fontSize: 13, lineHeight: 20, fontWeight: "500", color: "rgba(0, 0, 0, 0.50)" },
    body: { flex: 1, backgroundColor: "#FFFFFF" },
    bodyContent: { flexGrow: 1, paddingTop: 13, paddingRight: 33, paddingBottom: 40, paddingLeft: 22 },
    
    menuItemActive: { backgroundColor: "#BBD8FF" },
    menuTextActive: { color: "#0166FF" },
    menuItem: { width: "100%", minHeight: 24, flexDirection: "row", alignItems: "center", gap: 16, paddingVertical:14, paddingHorizontal: 11, borderRadius: 10, },
    icon: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
    menuText: { fontSize: 16, lineHeight: 20, fontWeight: "700", color: "#808080" },
    activityList: { gap: 6, },
    activitySection: { gap: 0},
    activityTitle: { width: "100%", flexDirection: "row", alignItems: "center", gap: 16, paddingVertical:14, paddingHorizontal: 11, borderRadius: 10,},
    arrowIcon: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
    arrowIconOpen: { transform: [{ rotate: "180deg" }] },
    activityTitleText: { flex: 1, fontSize: 16, lineHeight: 20, fontWeight: "700", color: "#808080" },
    activityMenuList: { gap: 8 },
    activityMenuItem: { width: "100%", height: 48, paddingHorizontal: 36, borderRadius: 10, justifyContent: "center" },
    activityMenuItemActive: { backgroundColor: "#BBD8FF" },
    activityMenuText: { fontSize: 16, lineHeight: 20, fontWeight: "500", color: "#808080" },
    activityMenuTextActive: { color: "#0166FF" },
    adminMenuGroup: { marginVertical: 20, gap: 22 },
    bottomMenu: { marginTop: "auto", paddingTop: 60 },
});