// src/screens/student/Home.style.ts
import { StyleSheet } from "react-native";
import { tokens } from "../../theme/common.Style";

export const styles = StyleSheet.create({
	/* Header */
	topbarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", },
	appTitle: { flex:1, textAlign: "center", fontSize: 24, fontWeight: "700", color: "black",  },
	
	/* Month header (ListHeaderComponent) */
	monthRow: { marginTop: 3, marginBottom: 19, },
	monthLeft: { flexDirection: "row", alignItems: "center", },
	h1: { fontSize: 24, fontWeight: "700", lineHeight: 50, color: tokens.colors.ink,  },
	monthBtn: { width: 35, height: 35, alignItems: "flex-start", justifyContent: "center", }, 
	chevronRotate: { transform: [{ rotate: "0deg" }], },
	
	/* MonthFilterSheet 내 임시 월 이동 UI */
	monthInputRow: { height: 60, borderWidth: 1, borderColor: "#DFDFDF", borderRadius: tokens.radius.r10, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", 
	justifyContent: "space-between", paddingHorizontal: 12, },
	monthInputText: { fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.50)",  }, 
	monthNavBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", },
	monthNavText: { fontSize: 28, lineHeight: 28, color: tokens.colors.ink,  },

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
	card: { borderRadius: tokens.radius.r10, paddingTop: 19, paddingBottom: 16, paddingLeft: 24, paddingRight: 44, backgroundColor: "#fff", position: "relative", },
	cardSelectedOutline: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: tokens.colors.primary ?? tokens.colors.ink, borderRadius: tokens.radius.r10, pointerEvents: "none", },
	cardLocked: { borderRadius: tokens.radius.r10, },
	cardRow: { flexDirection: "row", alignItems: "center", },
	thumb: { width: 28, height: 28, borderRadius: 5, backgroundColor: "#E3E3E3", marginRight: 25, },
	thumbSelected: { backgroundColor: tokens.colors.primary, },
	cardTextWrap: { flex: 1, flexDirection: "column", },
	cardTitle: { fontSize: 18, fontWeight: "800", color: tokens.colors.ink,  }, 
	cardSub: { marginTop: 5, fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.50)",  },
	
	/* 카드 우측 chevron(편집/이동) */
	editBtn: { position: "absolute", right: 0, top: 0, bottom: 0, width: 44, alignItems: "center", justifyContent: "center", },
	editIcon: { width: 24, height: 24, transform: [{ rotate: "-90deg" }],},

	/* Record Modal */
	preparingPage: { width: "100%", paddingTop: 40, paddingBottom: 40, paddingHorizontal: 20, backgroundColor: "#F0F6FF", alignItems: "center", justifyContent: "center", },
	preparingContent: { flexDirection: "column", alignItems: "center", justifyContent: "center", },
	preparingTitle: { fontSize: 20, fontWeight: "700", color: tokens.colors.ink, lineHeight: 20, marginBottom: 21, textAlign: "center",  },
	preparingDesc: { fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.5)", lineHeight: 28, textAlign: "center",  },
	
	/* Record Modal */
	backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end", },
	sheet: { backgroundColor: tokens.colors.bgLogin ?? tokens.colors.bg, borderTopLeftRadius: tokens.radius.r20, borderTopRightRadius: tokens.radius.r20,
	paddingTop: 33, paddingHorizontal: 20, paddingBottom: 53, },
	sheetHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 4, },
	sheetTitle: { flex: 1, textAlign: "center", fontSize: 24, fontWeight: "700", color: tokens.colors.ink, lineHeight: 28,  },
	sheetClose: { fontSize: 24, lineHeight: 24, color: tokens.colors.ink,  },
	sheetDesc: { marginTop: 16, marginBottom: 18, fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.50)", textAlign: "center", lineHeight: 24,  },
	sheetPrimary: { height: 60, borderRadius: 12, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", },
	sheetPrimaryText: { fontSize: 16, fontWeight: "700", color: "#fff",  },

	/* Record Modal - weekday chips */
	weekRow: { flexDirection: "row", justifyContent: "center", gap: 8, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 14, },
	weekChip: { width: 34, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#d9d9d9", },
	weekChipActive: { backgroundColor: tokens.colors.primary, },
	weekChipText: { fontSize: 16, fontWeight: "700", color: "#868686",  },
});
