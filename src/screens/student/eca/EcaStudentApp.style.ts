import { StyleSheet } from "react-native";

export const ecaStudentAppStyles = StyleSheet.create({
    shell: { flex: 1, position: "relative", backgroundColor: "#F0F6FF",},
    body: { flex: 1 },
    bottomNavWrap: { backgroundColor: "#FFFFFF", zIndex: 10, elevation: 10 },
    bottomNavSafe: { backgroundColor: "#FFFFFF" },
    bottomNav: { height: 96, paddingTop: 14, paddingRight: 46, paddingBottom: 18, paddingLeft: 46, borderTopWidth: 1, borderTopColor: "#E6E6E6", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    bottomNavItem: { width: 48, flexBasis: 48, flexShrink: 0, alignItems: "center", justifyContent: "center", gap: 4 },
    bottomNavIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    bottomNavIconActive: { backgroundColor: "#BDD8FF" },
    bottomNavText: { fontSize: 12, lineHeight: 16, fontWeight: "800", color: "#808080" },
    bottomNavTextActive: { color: "#0166FF" },
});