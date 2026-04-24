// src/screens/student/questions/Questions.style.ts
import { StyleSheet } from "react-native";
import { tokens } from "../../../theme/common.Style";

export const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F0F6FF" },
    wrap: { paddingHorizontal: 40, paddingBottom: 170 },   
	// Header
	headerCenter: { flex: 1, justifyContent: "center", alignItems: "center", },
	headerTitle: { fontSize: 16, fontFamily: tokens.typography.fontFamily, color: tokens.colors.ink, textAlignVertical: "center",},

    topbarTitle: { textAlign: "center", fontSize: 16, fontWeight: "700", color: tokens.colors.ink, fontFamily: tokens.typography.fontFamily, paddingHorizontal: 12 },

    questionPage: { marginTop: 34 },
    mascot: { width: 119, height: 119, marginBottom: 7, alignSelf: "flex-start" },

    progressCard: { minHeight: 305, marginTop: 0, paddingTop: 18, paddingRight: 20, paddingBottom: 24, paddingLeft: 17, backgroundColor: "#fff", borderRadius: 10, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    progressBar: { width: "100%", height: 10, backgroundColor: "#E3E3E3", borderRadius: 999, overflow: "hidden", },
    progressBarFill: { height: "100%", backgroundColor: tokens.colors.primary, borderRadius: 999 },
    progressLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    progressLabelText: { fontSize: 12, color: "rgba(0,0,0,0.50)", fontWeight: "500", lineHeight: 20, fontFamily: tokens.typography.fontFamily },

    questionCard: { width: "100%", backgroundColor: "transparent", borderRadius: 20 },
    questionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    qBadge: { width: 30, height: 30, borderRadius: 5, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", },
    qBadgeText: { fontSize: 18, color: "#FFFFFF", fontWeight: "700", fontFamily: tokens.typography.fontFamily },
    questionText: { marginTop: 4, fontSize: 18, color: tokens.colors.ink, fontWeight: "700", lineHeight: 25, fontFamily: tokens.typography.fontFamily },

    micButton: { position: "absolute", bottom: 54, alignSelf: "center", width: 105, height: 105, borderRadius: 999, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", zIndex: 10 },
    micIcon: { width: 40, height: 40 },

    recordingSheet: { position: "absolute", left: 0, right: 0, bottom: 0, height: 401, backgroundColor: tokens.colors.primary, borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: "center", justifyContent: "flex-start", paddingTop: 32, zIndex: 1200 },
    recordingSheetInner: { width: "100%", paddingHorizontal: 30, alignItems: "center" },
    recordingMeter: { width: "100%", height: 100, backgroundColor: "#FFFFFF", borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 35 },
    recordingWave: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 64, overflow: "hidden" },
    waveBar: { width: 4, height: 67, borderRadius: 999, backgroundColor: tokens.colors.primary, marginHorizontal: 2.5 },
    recordingText: { marginTop: 0, marginBottom: 21, fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center", lineHeight: 22, height: 40, textAlignVertical: "center",},

    recordingMicRing: { width: 133, height: 133, borderRadius: 999, alignItems: "center", justifyContent: "center" },
    recordingMicRingBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999 },
    recordingMicRingActive: { backgroundColor: "rgba(255,255,255,0.35)" },
    recordingMicRingDisabled: { backgroundColor: "#ccc" },

    recordingMicBtn: { width: 105, height: 105, borderRadius: 999, backgroundColor: "#F6F6F6", alignItems: "center", justifyContent: "center" },
    recordingMicBtnActive: { backgroundColor: "#F6F6F6" },
    recordingMicBtnDisabled: { backgroundColor: "#F6F6F6" },

    recordingMicBtnImage: { width: 42, height: 42 },

    outroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(255,255,255,0.58)", alignItems: "center", justifyContent: "center", zIndex: 2000 },
    outroCard: { alignItems: "center", justifyContent: "center" },
    outroIcon: { width: 52, height: 52, borderRadius: 999, marginBottom: 10, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center" },
    outroIconImg: { width: 40, height: 40 },
    outroText: { fontSize: 20, fontWeight: "700", color: tokens.colors.primary, lineHeight: 28, fontFamily: tokens.typography.fontFamily },

    completedWrap: { flex: 1, backgroundColor: "#F0F6FF", alignItems: "center", justifyContent: "flex-start", paddingLeft: 20, paddingRight: 20, paddingBottom: 50 },
    completionContent: { width: "100%", alignItems: "center", justifyContent: "center", marginTop: 220 },
    completionTitle: { fontSize: 24, fontWeight: "700", color: tokens.colors.ink, lineHeight: 30, marginBottom: 21, fontFamily: tokens.typography.fontFamily },
    completionDesc: { marginTop: 0, fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.50)", lineHeight: 28, textAlign: "center", fontFamily: tokens.typography.fontFamily },
    completionMargin: { height: 18 },

    loadingDots: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 20 },
    loadingDot: { width: 12, height: 12, borderRadius: 999, backgroundColor: tokens.colors.primary, marginHorizontal: 5.5 },
});