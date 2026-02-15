// src/screens/student/mypage/MyPage.style.ts
import { StyleSheet } from "react-native";
import { commonStyles, tokens } from "../../../theme/common.Style";

export const styles = StyleSheet.create({
  screen: {
    backgroundColor: tokens.colors.bg,
  },

  // ScrollView contentContainerStyle
  container: {
    // 웹: padding 20 + safe-area bottom
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 160, // 하단 고정 로그아웃 버튼 공간 확보
    flexGrow: 1,
  },

  // Header
  header: {
    position: "relative",
    height: 72,
    justifyContent: "center",
    alignItems: "center",
  },
  previousBtn: {
    position: "absolute",
    left: 0,
    top: 14,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  headerCenter: {
    paddingHorizontal: 40,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: tokens.colors.ink,
    fontFamily: tokens.typography.fontFamily,
  },
  headerRightSpace: {
    position: "absolute",
    right: 0,
    top: 14,
    width: 24,
    height: 24,
  },

  // Top section
  top: {
    alignItems: "center",
  },
  profileWrap: {
    alignItems: "center",
    gap: 16,
  },

  profileImgWrap: {
    position: "relative",
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImg: {
    width: 102,
    height: 102,
    borderRadius: 999,
  },
  verifyBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 27,
    height: 27,
  },

  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: tokens.colors.ink,
    fontFamily: tokens.typography.fontFamily,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: tokens.colors.ink,
    fontFamily: tokens.typography.fontFamily,
  },
  subText: {
    marginTop: -6,
    fontSize: 16,
    fontWeight: "500",
    color: "#A2A2A2",
    fontFamily: tokens.typography.fontFamily,
  },

  // Cards / menu
  cards: {
    marginTop: 18,
    alignItems: "center",
  },

  verifyCard: {
    height: 50,
    paddingHorizontal: 21,
    borderRadius: tokens.radius.r10,
    backgroundColor: "#BDD8FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    alignSelf: "center",
  },
  verifyCardPending: {
    opacity: 0.85,
  },
  verifyCardRejected: {
    opacity: 0.95,
  },
  verifyBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.0)", // 웹에서는 span만 있었어서 “점” 필요 없으면 제거 가능
  },
  verifyCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: tokens.colors.ink,
    fontFamily: tokens.typography.fontFamily,
  },
  disabled: {
    opacity: 0.55,
  },

  menu: {
    marginTop: 25,
    paddingHorizontal: 17,
    width: "100%",
    gap: 10,
  },
  menuItem: {
    height: 60,
    paddingHorizontal: 18,
    backgroundColor: "#fff",
    borderRadius: tokens.radius.r10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // 공통 카드 그림자(있으면 사용)
    ...((commonStyles as any).cardShadow ?? {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    }),
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: tokens.colors.ink,
    fontFamily: tokens.typography.fontFamily,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  menuValue: {
    fontSize: 16,
    fontWeight: "600",
    color: tokens.colors.ink,
    fontFamily: tokens.typography.fontFamily,
  },
  menuChevron: {
    width: 18,
    height: 18,
    transform: [{ rotate: "-90deg" }],
  },

  // Logout fixed dock
  logoutDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 16,
    paddingTop: 8,
    alignItems: "center",
  },
  logoutBtn: {
    width: 200,
    height: 60,
    borderRadius: tokens.radius.r10,
    backgroundColor: tokens.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    fontFamily: tokens.typography.fontFamily,
  },
});
