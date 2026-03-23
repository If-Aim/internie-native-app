// src/screens/student/Home.style.ts
import { StyleSheet } from "react-native";
import { tokens } from "../../theme/common.Style";

export const styles = StyleSheet.create({
	/* Header */
	topbarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", },
	appTitle: { flex:1, textAlign: "center", fontSize: 24, fontWeight: "700", color: "black",  },
	headerLeftSpace: {width: 24, height: 24,},
	
	/* Month header (ListHeaderComponent) */
	monthRow: { marginTop: 3, marginBottom: 19, },
	monthLeft: { flexDirection: "row", alignItems: "center", },
	h1: { fontSize: 24, fontWeight: "700", lineHeight: 50, color: tokens.colors.ink,  },
	monthBtn: { width: 35, height: 35, alignItems: "flex-start", justifyContent: "center", }, 
	chevronRotate: { transform: [{ rotate: "0deg" }], },
	
	/* MonthFilterSheet 내 임시 월 이동 UI */
	monthInputRow: { height: 60, borderWidth: 1, borderColor: "#DFDFDF", borderRadius: tokens.radius.r10, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", 
	justifyContent: "space-between", paddingHorizontal: 19, },
	monthInputText: { fontSize: 18, fontWeight: "500", color: "rgba(0,0,0,0.50)",  }, 

	/* Loading */
	loadingWrap: { paddingTop: 40, paddingBottom: 40, alignItems: "center", justifyContent: "center", },

	/* Empty */ 
	emptyWrap: { paddingTop: 120, paddingBottom: 80, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, },
	emptyImg: { width: 119, height: 119, marginBottom: 15, },
	emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: "500", textAlign:"center", color: "#979797",  },
	emptyBtn: { marginTop: 25, width: 160, height: 50, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#E3E3E3", },
	emptyBtnText: { fontSize: 16, fontWeight: "700", color: "#707070",  },


	/* Section */
	sectionTitle: { fontSize: 16, color: "#979797", fontWeight: "500", marginBottom: 13,  },
	
	/* Card */
	cardOuter: { marginBottom: 11, },
	cardShadowWrap: { borderRadius: tokens.radius.r10, backgroundColor: "#fff", /*...(tokens.shadow.card as any)*/ },
	card: { borderRadius: tokens.radius.r10, height: 80, paddingTop: 19, paddingBottom: 16, paddingLeft: 24, paddingRight: 44, backgroundColor: "#fff", position: "relative", },
	cardSelectedOutline: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: tokens.colors.primary ?? tokens.colors.ink, borderRadius: tokens.radius.r10, pointerEvents: "none", },
	cardLocked: { borderRadius: tokens.radius.r10, },
	cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "center",},
	thumb: { width: 28, height: 28, borderRadius: 5, backgroundColor: "#E3E3E3", marginRight: 25, },
	thumbSelected: { backgroundColor: tokens.colors.primary, },
	cardTextWrap: { flex: 1, flexDirection: "column", justifyContent: "center",},
	cardTitle: { fontSize: 16, fontWeight: "700", color: tokens.colors.ink, lineHeight: 20, }, 
	cardSub: { marginTop: 5, fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.50)", lineHeight: 20, },
	
	/* 카드 우측 chevron(편집/이동) */
	editBtn: { position: "absolute", right: 0, top: 0, bottom: 0, width: 44, alignItems: "center", justifyContent: "center", },
	editIcon: { width: 24, height: 24, transform: [{ rotate: "-90deg" }],},

	/* Record Modal */
    preparingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#F0F6FF", alignItems: "center", justifyContent: "center", zIndex: 3000 },
    preparingContent: { width: "100%", paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
    preparingDotsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 48 },
    preparingDot: { width: 12, height: 12, borderRadius: 999, backgroundColor: tokens.colors.primary, marginHorizontal: 5 },
    preparingTitle: { fontSize: 20, fontWeight: "700", color: tokens.colors.ink, lineHeight: 22, marginBottom: 21, textAlign: "center" },
    preparingDesc: { fontSize: 18, fontWeight: "500", color: "rgba(0,0,0,0.50)", lineHeight: 30, textAlign: "center" },

	/* Record Modal */
	backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end", },
	sheet: { backgroundColor: tokens.colors.bgLogin ?? tokens.colors.bg, borderTopLeftRadius: tokens.radius.r20, borderTopRightRadius: tokens.radius.r20,
	paddingTop: 19, paddingHorizontal: 10, paddingBottom: 53, },
	sheetHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 15, },
	sheetTitle: { flex: 1, textAlign: "center", fontSize: 24, fontWeight: "700", color: tokens.colors.ink, lineHeight: 28, paddingLeft: 24, },
	sheetClose: { fontSize: 24, lineHeight: 24, color: tokens.colors.ink, },
	sheetDesc: { marginTop: 16, marginBottom: 18, fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.50)", textAlign: "center", lineHeight: 24,  },
	sheetPrimary: { height: 60, borderRadius: 10, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", marginHorizontal: 10, },
	sheetPrimaryText: { fontSize: 16, fontWeight: "700", color: "#fff",  },
	sheetDate: { fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.50)", lineHeight: 20, textAlign: "center", marginBottom: 16 },
	
	/* Record Modal - weekday chips */
    weekRow: { flexDirection: "row", justifyContent: "center", paddingTop: 1, paddingBottom: 14 },
    weekChip: { width: 34, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#D9D9D9", marginHorizontal: 3 },
    weekChipActive: { backgroundColor: tokens.colors.primary },
    weekChipText: { fontSize: 18, fontWeight: "700", color: "#868686" },
    weekChipTextActive: { color: "#FFFFFF" },

    recordIntroWrap: { alignItems: "center", marginBottom: 10 },
    speechBubble: { paddingHorizontal: 22, flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" },
    speechDesc: { minHeight: 80, minWidth: 200, borderRadius: 10, backgroundColor: "#BDD8FF", alignItems: "center", justifyContent: "center", },
    speechBubbleTail: { position: "relative", width: 0, height: 0, borderLeftWidth: 15, borderRightWidth: 15, borderTopWidth: 23, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#BDD8FF" },
    speechBubbleText: { fontSize: 18, fontWeight: "700", color: tokens.colors.ink, lineHeight: 25, textAlign: "center" },
    recordMascot: { width: 120, height: 120},

});
