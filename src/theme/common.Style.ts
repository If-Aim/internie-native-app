// src/theme/common.Style.ts
import { Platform, StyleSheet } from "react-native";

export const tokens = {
  safe: { top: 0, bottom: 0,},

  colors: {
    bg: "#F0F6FF",
    bgLogin: "#F0F6FF",
    bgWhite: "#ffffff",

    primary: "#0166FF",
    primaryLight: "#0166FF",

    ink: "#111111",
    muted: "#AEAEAE",
    danger: "#ef4444",

    gray700: "#707070",
    grayE3: "#E3E3E3",
    overlay45: "rgba(0,0,0,0.45)",
    overlay50: "rgba(0,0,0,0.50)",
  },

  radius: {
    r10: 10,
    r12: 12,
    r18: 18,
    r20: 20,
    r24: 24,
    pill: 9999,
  },

  shadow: {
    card: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
      default: {},
    }) as object,

    sheet: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
      },
      android: { elevation: 10 },
      default: {},
    }) as object,
  },

  sizes: { headerH: 50,},

  typography: { fontFamily: "Pretendard",},
} as const;

export const commonStyles = StyleSheet.create({
  appRoot: { flex: 1, backgroundColor: tokens.colors.bg, },
  screenBase: { flex: 1, backgroundColor: tokens.colors.bg, },

  // ====== wrap / screen ======
  wrap: { minWidth: 300 as any, paddingHorizontal: 20, paddingBottom: 150, flex: 1, },
  screen: { flex: 1, minHeight: "100%" as any, minWidth: 300 as any, flexDirection: "column", },

  // spacer-50 
  spacer50: { height: 30, width: "100%", flexShrink: 0, },

  // ====== 아이콘/버튼 공통 ======
  iconbtn: { backgroundColor: "transparent", borderWidth: 0, padding: 0, },
  icon24: { width: 24, height: 24, },

  // ====== topbar-main ======
  topbarMain: { paddingTop: 19, paddingHorizontal: 20, paddingBottom: 23,  width: "100%", backgroundColor: tokens.colors.bg, }, 
  
  // ====== Drawer ======
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2100,
  },

  drawerPanel: { position: "absolute", top: 0, left: 0, bottom: 0, width: "95%", backgroundColor: "#fff", zIndex: 2101, flexDirection: "column", ...(tokens.shadow.card as any), },
  drawerHeader: { paddingTop: 79, paddingHorizontal: 36, paddingBottom: 18, backgroundColor: "#EAF1FA", }, 
  profileWrap: { flexDirection: "row", gap: 20 as any, },
  profileImg: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff", },
  profileName: { fontSize: 24, lineHeight: 20, fontWeight: "700", color: "#111", marginBottom: 5, fontFamily: tokens.typography.fontFamily, },
  profileEmail: { fontSize: 13, color: "rgba(0,0,0,0.50)", fontWeight: "500", lineHeight: 20, fontFamily: tokens.typography.fontFamily, },

  drawerBody: { flex: 1, paddingTop: 46, paddingHorizontal: 32, flexDirection: "column", },
  drawerMenuItem: { flexDirection: "row", alignItems: "center", gap: 14 as any, paddingVertical: 10, },
  drawerMenuItemText: { fontSize: 16, fontWeight: "700", color: "#000", fontFamily: tokens.typography.fontFamily, },

  bottomSpacer: { height: 250,},

  // ====== 하단 CTA ======
  bottomCta: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 37, paddingHorizontal: 20, paddingBottom: 53, backgroundColor: tokens.colors.bg, zIndex: 20, }, 
  recordBtn: { width: "100%", height: 60, borderRadius: tokens.radius.r10, backgroundColor: tokens.colors.grayE3, alignItems: "center", justifyContent: "center", },  
  recordBtnText: { fontSize: 16, fontWeight: "800", color: tokens.colors.gray700, fontFamily: tokens.typography.fontFamily, },
  recordBtnEnabled: { backgroundColor: tokens.colors.primary, borderRadius: tokens.radius.r10, },
  recordBtnEnabledText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: tokens.typography.fontFamily, },

  // ====== 기간 선택 ======
  periodSheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: tokens.colors.overlay50, zIndex: 99999, justifyContent: "flex-end", },
  periodSheet: { width: "100%", maxWidth: 520, alignSelf: "center", backgroundColor: "#fff", borderTopLeftRadius: tokens.radius.r24, borderTopRightRadius: tokens.radius.r24, paddingTop: 37, paddingHorizontal: 20, paddingBottom: 53, ...(tokens.shadow.sheet as any), },
  periodSheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5, paddingLeft: 12, },
  periodSheetTitle: { fontSize: 24, fontWeight: "700", letterSpacing: -0.02 as any, fontFamily: tokens.typography.fontFamily, }, 
  periodSheetBody: {paddingTop: 10, paddingRight: 9, paddingBottom: 14, paddingLeft: 12, },
  periodSheetSection: { marginTop: 20, },
  periodSheetLabel: { fontSize: 16, fontWeight: "500", color: "#000", marginBottom: 11, paddingLeft: 9, fontFamily: tokens.typography.fontFamily, },
  sortRow: { flexDirection: "row", gap: 10 as any, },
  sortBtn: { flex: 1, height: 60, borderRadius: tokens.radius.r10, borderWidth: 1, borderColor: "#DFDFDF", backgroundColor: "#fff", alignItems: "center", justifyContent: "center", },
  sortBtnText: { fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.50)", fontFamily: tokens.typography.fontFamily, },
  sortBtnActive: { borderWidth: 2, borderColor: tokens.colors.primary, },
  sortBtnActiveText: { color: "#000", },

  // ====== wheel ======
  wheelWrap: { height: 52 * 5, flexDirection: "row", justifyContent: "center", position: "relative", }, 
  wheelCol: {width: "40%", maxWidth: 220, },  
  wheelItem: { height: 52, alignItems: "center", justifyContent: "center", },
  wheelItemText: { fontSize: 20, fontWeight: "700", color: "rgba(0,0,0,0.50)", fontFamily: tokens.typography.fontFamily, },
  wheelItemActiveText: { color: "#000", },
  wheelHighlight: { position: "absolute", left: 10, right: 10, top: "50%", marginTop: -26, height: 52, borderRadius: tokens.radius.r10, },

  // ====== 월(month) 선택 ======
  monthpickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)", zIndex: 10000, justifyContent: "flex-end", },
  monthpickerSheet: { width: "100%", backgroundColor: "#fff", borderTopLeftRadius: tokens.radius.r20, borderTopRightRadius: tokens.radius.r20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 53, },
  monthpickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", }, 
  monthpickerTitle: { fontSize: 22, fontWeight: "800", fontFamily: tokens.typography.fontFamily, },
  monthpickerConfirm: { width: "100%", height: 60, borderRadius: tokens.radius.r10, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", marginTop: 14, },
  monthpickerConfirmText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: tokens.typography.fontFamily, },

  // ====== 로딩 ======
  preparingPage: { flex: 1, minHeight: "100%" as any, justifyContent: "center", paddingHorizontal: 20, paddingBottom: 50, backgroundColor: tokens.colors.bg, alignItems: "center", }, 
  preparingTitle: { fontSize: 20, fontWeight: "700", color: "#000", lineHeight: 20, marginBottom: 21, fontFamily: tokens.typography.fontFamily, }, 
  preparingDesc: { fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.5)", lineHeight: 28, fontFamily: tokens.typography.fontFamily, },
  loadingDots: { flexDirection: "row", alignItems: "center", gap: 11 as any, marginBottom: 14, },
  loadingDot: { width: 12, height: 12, borderRadius: 9999, backgroundColor: tokens.colors.primary, },
});
