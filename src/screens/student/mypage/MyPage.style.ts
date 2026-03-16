// src/screens/student/mypage/MyPage.style.ts
import { StyleSheet } from "react-native";
import { commonStyles, tokens } from "../../../theme/common.Style";

export const styles = StyleSheet.create({
	container: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 160, flexGrow: 1, },

	// Header
	headerCenter: { paddingHorizontal: 40, },
	headerTitle: { fontSize: 16, fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, },
	headerRightSpace: { width: 24, height: 24, }, 

	// Top
	top: { alignItems: "center", }, 
	profileWrap: { alignItems: "center", gap: 16, },
	profileImgWrap: { position: "relative", width: 120, height: 120, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", }, 
	profileImg: { width: 102, height: 102, borderRadius: 999, },
	verifyBadge: { position: "absolute", right: 6, bottom: 6, width: 27, height: 27, },
	greeting: { fontSize: 24, fontWeight: "800", fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, },
	name: { fontSize: 24, fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, },
	subText: { fontSize: 18, lineHeight: 20, fontWeight: "600", fontFamily: tokens.typography.fontFamily, color: "#A2A2A2", },

	// Cards / menu
	cards: { alignItems: "center", },
	verifyCard: { marginTop: 25, height: 50, paddingHorizontal: 20, paddingVertical: 15, borderRadius: tokens.radius.r10, backgroundColor: "#BDD8FF", flexDirection: "row", alignItems: "center", justifyContent: "center", },
	verifyCardPending: { marginTop: 25, height: 50, paddingHorizontal: 20, paddingVertical: 15, borderRadius: tokens.radius.r10, backgroundColor: "#F1F1F1", flexDirection: "row", alignItems: "center", justifyContent: "center", },
	verifyCardTitle: { fontSize: 18, fontWeight: "700", lineHeight: 20, fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, },
	verifyCardTitlePending: { fontSize: 18, fontWeight: "700", lineHeight: 20, fontFamily: tokens.typography.fontFamily, color: "#A2A2A2", },

	menu: { marginTop: 25, paddingHorizontal: 17, width: "100%", gap: 10, },
	menuItem: { height: 60, paddingHorizontal: 18, backgroundColor: "#fff", borderRadius: tokens.radius.r10, flexDirection: "row", alignItems: "center", justifyContent: "space-between",},
	menuTitle: { fontSize: 18, fontWeight: "bold", fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, },
	menuRight: { flexDirection: "row", alignItems: "center", gap: 5, },
	menuValue: { fontSize: 14, fontWeight: "600",fontFamily: tokens.typography.fontFamily, color: "#A2A2A2", },
	menuChevron: { width: 24, height: 24, transform: [{ rotate: "-90deg" }], },

	// 인증코드
	verifyCodeHeader: { backgroundColor: "#fff",}, 

	// Logout
	logoutDock: { position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: 53, paddingTop: 8, alignItems: "center", },
	logoutBtn: { width: 200, height: 60, borderRadius: tokens.radius.r10, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", },
	logoutText: { fontSize: 18, fontWeight: "700", fontFamily: tokens.typography.fontFamily, color: "#fff", },
	
	// 회원탈퇴
	withdrawBtn: { marginTop: 16, alignItems: "center", justifyContent: "center", }, 
	withdrawText: { fontSize: 18, fontWeight: "500", color: "#A2A2A2", textDecorationLine: "underline", },

	modalBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 46, },
	modalCard: { width: "100%", maxWidth: 340, backgroundColor: "#fff", borderRadius: 20, paddingTop: 12, paddingHorizontal: 10, paddingBottom: 36, position: "relative", alignItems: "center", },
	modalClose: { position: "absolute", top: 16, right: 16, zIndex: 2, width: 40, height: 40, alignItems: "center", justifyContent: "center", },
	modalCloseIcon: { width: 24, height: 24, }, 
	modalBody: { marginTop: 53, marginBottom: 94, },
	modalTitle: { fontSize: 22, fontWeight: "700", color: tokens.colors.ink, marginBottom: 64, textAlign: "center", }, 
	modalReason: { fontSize: 14, lineHeight: 21, fontWeight: "700", marginBottom: 9, color: "#717171", textAlign: "center", },
	modalPrimaryButton: { height: 60, width: 200, borderRadius: 10, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", },
	modalPrimaryButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", },
	
});
