// src/screens/student/Home.style.ts
import { StyleSheet } from "react-native";
import { tokens } from "../../theme/common.Style";

export const styles = StyleSheet.create({
  /* Header */
  topbarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", },
  appTitle: { flex:1, textAlign: "center", fontSize: 24, fontWeight: "700", color: "black", fontFamily: tokens.typography.fontFamily, },
  
  /* Month header (ListHeaderComponent) */
  monthRow: { marginTop: 0, },
  monthLeft: { flexDirection: "row", alignItems: "center", },
  h1: { fontSize: 24, fontWeight: "700", lineHeight: 50, color: tokens.colors.ink, fontFamily: tokens.typography.fontFamily, },
  monthBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", }, 
  chevronRotate: { transform: [{ rotate: "0deg" }], },
  
  /* MonthFilterSheet 내 임시 월 이동 UI */
  monthInputRow: { height: 60, borderWidth: 1, borderColor: "#DFDFDF", borderRadius: tokens.radius.r10, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", 
  justifyContent: "space-between", paddingHorizontal: 12, },
  monthInputText: { fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.50)", fontFamily: tokens.typography.fontFamily, }, 
  monthNavBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", },
  monthNavText: { fontSize: 28, lineHeight: 28, color: tokens.colors.ink, fontFamily: tokens.typography.fontFamily, },

  /* Loading */
  loadingWrap: { paddingTop: 40, paddingBottom: 40, alignItems: "center", justifyContent: "center", },

  /* Empty */ 
  emptyWrap: { paddingTop: 120, paddingBottom: 80, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, },
  emptyImg: { width: 119, height: 119, marginBottom: 15, },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: "500", textAlign:"center", color: "#979797", fontFamily: tokens.typography.fontFamily, },
  emptyBtn: { marginTop: 25, width: 160, height: 50, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#E3E3E3", },
  emptyBtnText: { fontSize: 16, fontWeight: "700", color: "#707070", fontFamily: tokens.typography.fontFamily, },


  /* Section */
  section: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, },
  sectionTitle: { fontSize: 16, color: "#979797", fontWeight: "500", marginBottom: 12, fontFamily: tokens.typography.fontFamily, },
  
  /* Card */
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: tokens.radius.r20, paddingVertical: 14, paddingLeft: 14, paddingRight: 44, marginBottom: 10, backgroundColor: "#fff", position: "relative", },
  cardSelected: { borderColor: tokens.colors.primary ?? tokens.colors.ink, },
  cardLocked: { opacity: 0.6, },
  cardRow: { flexDirection: "row", alignItems: "center", },
  thumb: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#ddd", marginRight: 12, },
  thumbSelected: { backgroundColor: tokens.colors.ink, }, 
  cardTextWrap: { flex: 1, flexDirection: "column", },
  cardTitle: { fontSize: 16, fontWeight: "800", color: tokens.colors.ink, fontFamily: tokens.typography.fontFamily, },
  cardSub: { marginTop: 4, fontSize: 14, fontWeight: "500", color: "rgba(0,0,0,0.50)", fontFamily: tokens.typography.fontFamily, },

  /* 카드 우측 chevron(편집/이동) */
  editBtn: { position: "absolute", right: 0, top: 0, bottom: 0, width: 44, alignItems: "center", justifyContent: "center", },
  editIcon: { width: 24, height: 24, opacity: 0.9, },

  /* Record Modal */
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end", },
  sheet: { backgroundColor: tokens.colors.bgLogin ?? tokens.colors.bg, borderTopLeftRadius: tokens.radius.r20, borderTopRightRadius: tokens.radius.r20,
  paddingTop: 33, paddingHorizontal: 20, paddingBottom: 53, },
  sheetHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 4, },
  sheetTitle: { flex: 1, textAlign: "center", fontSize: 24, fontWeight: "700", color: "#000", lineHeight: 28, fontFamily: tokens.typography.fontFamily, },
  sheetClose: { fontSize: 24, lineHeight: 24, color: "#000", fontFamily: tokens.typography.fontFamily, },
  sheetDesc: { marginTop: 16, marginBottom: 18, fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.50)", textAlign: "center", lineHeight: 24, fontFamily: tokens.typography.fontFamily, },
  sheetPrimary: { height: 60, borderRadius: 12, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", },
  sheetPrimaryText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: tokens.typography.fontFamily, },

  /* Record Modal - weekday chips */
  weekRow: { flexDirection: "row", justifyContent: "center", gap: 8, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 14, },
  weekChip: { width: 34, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#d9d9d9", },
  weekChipActive: { backgroundColor: tokens.colors.primary, },
  weekChipText: { fontSize: 16, fontWeight: "700", color: "#868686", fontFamily: tokens.typography.fontFamily, },
});
