import { StyleSheet } from "react-native";

export const ecaStudentAppStyles = StyleSheet.create({
    shell: { flex: 1, position: "relative", backgroundColor: "#F0F6FF",},
    body: { flex: 1, overflow: "hidden" },
    animatedBody: { flex: 1 },
    bottomNavWrap: { backgroundColor: "#FFFFFF", zIndex: 10, elevation: 10 },
    bottomNavSafe: { backgroundColor: "#FFFFFF" },
    bottomNav: { position: "relative", height: 96, paddingTop: 14, paddingHorizontal: 39, paddingBottom: 18, borderTopWidth: 1, borderTopColor: "#E6E6E6", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    bottomNavActiveIndicator: { position: "absolute", left: 47, top: 14, width: 48, height: 48, borderRadius: 12, backgroundColor: "#BDD8FF" },
    bottomNavItem: { width: 64, flexBasis: 64, flexShrink: 0, zIndex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
    bottomNavIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    bottomNavIconActive: { backgroundColor: "#BDD8FF" },
    bottomNavText: { minWidth: 64, maxHeight: 12, fontSize: 10, lineHeight: 12, fontWeight: "700", color: "#808080", textAlign: "center", },
    bottomNavTextActive: { color: "#0166FF" },
});
