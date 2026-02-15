// src/screens/student/schedule/Schedule.style.ts
import { Platform, StyleSheet } from "react-native";
import { tokens } from "../../../theme/common.Style";

export const styles = StyleSheet.create({
  screen: { flex: 1, height: "100%" as any, flexDirection: "column", overflow: "hidden", minHeight: 0, backgroundColor: tokens.colors.bg,},

  // ====== topbar_newschedule ======
  topbarNewschedule: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 9, },
  topbarTitle: { fontSize: 16, fontWeight: "700", margin: 0 as any, lineHeight: 20, fontFamily: tokens.typography.fontFamily, },

  // ====== month-row ======
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, },
  monthLeft: { flexDirection: "row", alignItems: "center", gap: 4 as any, },
  monthLeftH1: { fontSize: 24, fontWeight: "700", color: "#000", lineHeight: 50, fontFamily: tokens.typography.fontFamily, },
  monthBtn: { width: 44, height: 44, backgroundColor: "transparent", borderWidth: 0, padding: 0, alignItems: "center", justifyContent: "center", },
  // month-pop
  monthPop: { position: "absolute", zIndex: 1000, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 10, minWidth: 120, ...(tokens.shadow.card as any),},
  monthMenu: { flexDirection: "column", maxHeight: 200, },
  monthItem: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, },
  monthItemText: { fontSize: 16, color: "#000", fontFamily: tokens.typography.fontFamily, }, 
  monthItemCurrentText: { color: tokens.colors.primary, fontWeight: "700", },

  // ====== 카드(card) ======
  card: { backgroundColor: "#fff", borderRadius: tokens.radius.r10, padding: 16, marginBottom: 11, borderWidth: 2, borderColor: "transparent", ...(tokens.shadow.card as any), }, 
  cardSelected: { borderColor: tokens.colors.primary, },
  cardLocked: { borderWidth: 0, ...(Platform.OS === "android" ? { elevation: 0 } : {}), },
  item: { flexDirection: "row", alignItems: "center", gap: 25 as any, },
  thumb: { width: 28, height: 28, marginLeft: 8, borderRadius: 5, backgroundColor: tokens.colors.grayE3, flexShrink: 0, },
  thumbSelected: { backgroundColor: tokens.colors.primary, },
  title: { fontSize: 16, fontWeight: "700", color: "#000", marginBottom: 5, fontFamily: tokens.typography.fontFamily, },
  subtitle: { minHeight: 16, fontSize: 14, color: "#888", fontWeight: "500", fontFamily: tokens.typography.fontFamily, },

  // ====== new-event ======
  newEvent: { flex: 1, paddingTop: 10, paddingRight: 22, paddingBottom: 240, paddingLeft: 36, },
  titleInput: { width: "100%", borderWidth: 0, backgroundColor: "transparent", fontSize: 24, lineHeight: 20, color: "#222", marginTop: 30, marginBottom: 25, fontWeight: "700", fontFamily: tokens.typography.fontFamily, },
  
  // ====== row / row-head / sub ======
  row: { height: 44, flexDirection: "row", alignItems: "center", gap: 16 as any, padding: 0, },
  rowCol: { flex: 1, alignSelf: "stretch", flexDirection: "column", justifyContent: "flex-end", },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 15 as any, }, 
  rowToday: { fontSize: 16, marginBottom: 2, fontWeight: "700", lineHeight: 20, color: "#000", fontFamily: tokens.typography.fontFamily, },
  rowSub: { paddingLeft: 39, fontSize: 14, color: tokens.colors.muted, fontWeight: "500", lineHeight: 20, fontFamily: tokens.typography.fontFamily, }, 
  rowSubBtn: { paddingLeft: 39, paddingRight: 39, }, 
  
  addBtnWrapper: { marginLeft: "auto", position: "relative", width: 24, marginTop: -20, },
  addDate: { position: "absolute", left: 0, width: 24, height: 24, backgroundColor: "transparent", borderRadius: 8, alignItems: "center", justifyContent: "center", },
  add: { position: "absolute", left: 0, width: 24, height: 24, backgroundColor: "transparent", borderRadius: 8, alignItems: "center", justifyContent: "center", }, 

  // ====== memo-box ======
  memoBox: { marginTop: 23, marginLeft: 3, height: 177, backgroundColor: "#fff", borderRadius: tokens.radius.r12, paddingVertical: 20, paddingHorizontal: 36, }, 
  memoInput: { width: "100%", minHeight: 120, fontSize: 14, lineHeight: 20, color: tokens.colors.muted, fontWeight: "500", fontFamily: tokens.typography.fontFamily, textAlignVertical: "top", },

  // ====== footer-fixed / btn-primary / btn-danger ======
  footerFixed: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 53, backgroundColor: "rgba(246,248,251,0.9)", },
  btnPrimary: { width: "100%", height: 60, borderRadius: tokens.radius.r10, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 50, fontFamily: tokens.typography.fontFamily, },
  btnDanger: { backgroundColor: tokens.colors.danger, }, 
  btnDelete: {width: "100%", height: 60, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 10, backgroundColor: "#BDD8FF", marginBottom: 12, justifyContent: "center", alignItems: "center",},
  btnDeleteText: {fontSize:16,fontWeight:"700", color:"#000",},
  // ====== sheet-backdrop / sheet-card / time-list (시간 선택 팝오버) ======
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent", zIndex: 1000, justifyContent: "flex-end", },
  sheetBackdropCal: { backgroundColor: "rgba(0,0,0,0.5)", },

  // sheet-card:not(.sheet-card--date) 작은 팝오버
  sheetCard: { position: "absolute", right: 44, top: 231, width: 150, maxHeight: 180, backgroundColor: "#fff", borderRadius: tokens.radius.r12, paddingTop: 10, paddingRight: 5, paddingBottom: 10, paddingLeft: 14, overflow: "hidden", ...(tokens.shadow.card as any), },
  timeList: { maxHeight: 150, },
  timeItem: { paddingVertical: 2, paddingHorizontal: 4, },
  timeItemText: { fontSize: 14, color: tokens.colors.muted, fontWeight: "500", lineHeight: 20, fontFamily: tokens.typography.fontFamily, }, 
  timeItemDisabled: { opacity: 0.35, },
  timeItemSelected: { borderRadius: 5, backgroundColor: "#1463ff", },
  timeItemSelectedText: { color: "#fff", },

  // ====== date sheet (달력 시트) ======
  sheetCardDate: { position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", backgroundColor: "#fff", borderTopLeftRadius: tokens.radius.r24, borderTopRightRadius: tokens.radius.r24, overflow: "hidden", },
  sheetCardDate5w: { height: 620 },
  sheetCardDate6w: { height: 620, maxHeight: 790 },

  cal: { position: "relative", },
  calHeader: { flexDirection: "column", gap: 12 as any, marginBottom: 14, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 10, },
  calHeaderTop: { flexDirection: "row", justifyContent: "flex-end", },
  calHeaderBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 33, paddingRight: 41, },
  calCloseBtn: { paddingTop: 10, paddingRight: 2, borderRadius: tokens.radius.r10, width: 44, height: 44, alignItems: "center", justifyContent: "center", }, 
  
  calTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 as any, fontFamily: tokens.typography.fontFamily, },
  calNav: { flexDirection: "row", gap: 16 as any, },
  calNavBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", },
  
  calBody: { paddingLeft: 43, paddingRight: 52, }, 
  calWeek: { flexDirection: "row", justifyContent: "space-between", marginBottom: 17, },
  calWeekday: { width: 38, textAlign: "center", paddingVertical: 6, fontSize: 16, fontWeight: "500", color: "#333", fontFamily: tokens.typography.fontFamily, },
  calGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 6 as any, columnGap: 0 as any, }, 
  calCell: { width: "14.2857%" as any, alignItems: "center", justifyContent: "center", paddingVertical: 3, },
  calCellEmpty: { opacity: 0, },
  calDay: { width: 38, height: 38, borderRadius: 6, alignItems: "center", justifyContent: "center", },
  calDayText: { fontSize: 16, fontWeight: "500", color: "#666", fontFamily: tokens.typography.fontFamily, },
  calDayOut: { opacity: 0.25, }, 
  calDaySelected: { backgroundColor: "#0B5CFF", },
  calDaySelectedText: { color: "#fff", },
  calRange: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(1, 102, 255, 0.20)", zIndex: 0,},  
  calDayFront: { zIndex: 1, },
  calRangeHint: { marginTop: 10, fontSize: 14, opacity: 0.55, textAlign: "center", fontFamily: tokens.typography.fontFamily, },

  sheetConfirm: { marginTop: 10, marginHorizontal: 20, marginBottom: 45, height: 60, borderRadius: tokens.radius.r10, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", },
  sheetConfirmText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: tokens.typography.fontFamily, },

  // ====== timewheel ======
  timewheel: { paddingTop: 15, paddingHorizontal: 18, paddingBottom: 12, },
  timewheelPeriod: { textAlign: "center", fontSize: 14, fontWeight: "500", marginBottom: 10, color: tokens.colors.muted, fontFamily: tokens.typography.fontFamily, },
  timewheelRow: { flexDirection: "row", gap: 5 as any, paddingHorizontal: 12, paddingBottom: 6, },
  timewheelItem: { minWidth: 73, width: 73, height: 73, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: "transparent", }, 
  timewheelItemText: { fontSize: 16, fontWeight: "700", color: "#000", fontFamily: tokens.typography.fontFamily, },
  timewheelItemSelected: { backgroundColor: tokens.colors.primary, },
  timewheelItemSelectedText: { color: "#fff", },
  timewheelItemLeftEdgeText: { opacity: 0.5, },

  // ====== detailSchedule ======
  detailScreen: { flex: 1, backgroundColor: tokens.colors.bg, },
  detailTopbar: { height: 50, paddingHorizontal: 12, paddingTop: 20, flexDirection: "row", alignItems: "center", },
  detailTopbarTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", lineHeight: 20, fontFamily: tokens.typography.fontFamily, },
  detailTopbarClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center", },
  
  detailBody: { flex: 1, paddingTop: 42, paddingBottom: 24, },
  detailCard: { width: "100%", minHeight: 450, backgroundColor: "#fff", borderRadius: tokens.radius.r10, ...(tokens.shadow.card as any), },
  
  qaWrap: { minHeight: 450, flexDirection: "column", gap: 21 as any, paddingTop: 30, paddingRight: 18, paddingBottom: 17, paddingLeft: 22, }, 
  qaQText: { fontSize: 16, fontWeight: "700", color: "#000", fontFamily: tokens.typography.fontFamily, },
  qaAText: { fontSize: 16, fontWeight: "500", color: "#000", lineHeight: 24, fontFamily: tokens.typography.fontFamily, }, 
  detailCenter: { minHeight: 450, alignItems: "center", justifyContent: "center", },
  detailEmpty: { fontSize: 12, fontWeight: "500", color: "#979797", fontFamily: tokens.typography.fontFamily, },
  muted: { color: "#7a7a7a", fontFamily: tokens.typography.fontFamily, },
  
  detailDots: { flexDirection: "row", justifyContent: "center", minHeight: 10, marginBottom: 20, },
  detailDotsPlaceholder: { opacity: 0, },
  dot: { width: 10, height: 10, borderRadius: 9999, backgroundColor: "#D9D9D9", marginHorizontal: 4, },
  dotActive: { backgroundColor: tokens.colors.primary, }, 
  
  detailPage: { justifyContent: "center", alignItems: "center", },
  detailFooter: { marginTop: "auto", }, 
  detailRecordedAt: { fontSize: 12, fontWeight: "500", color: "#979797", fontFamily: tokens.typography.fontFamily, },

  // ====== outro ======
  outroText: {fontSize: 12, fontWeight: "500", color: "#000",},
}); 
