// src/screens/student/questions/Questions.style.ts
import { StyleSheet } from "react-native";
import { tokens } from "../../../theme/common.Style";

export const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: tokens.colors.bg, },
    wrap: { paddingHorizontal: 20, paddingBottom: 160, },
    
    // Topbar
    topbarQuestion: { height: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", }, 
    iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", },
    icon24: { width: 24, height: 24, },
    topbarTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: tokens.colors.ink, fontFamily: tokens.typography.fontFamily, paddingHorizontal: 10, },

    // Main
    questionPage: { marginTop: 20, },
    mascot: { width: 119, height: 119, marginBottom: 7, },

    // Progress card
    progressCard: { minHeight: 250, marginTop: 12, paddingTop: 18, paddingRight: 20, paddingBottom: 28, paddingLeft: 19, backgroundColor: "#fff", borderRadius: 18, shadowColor: "#000",
    shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 4, },
    progressBar: { width: "100%", height: 10, backgroundColor: "#d4d4d4", borderRadius: 6, overflow: "hidden", },
    progressBarFill: { height: "100%", backgroundColor: tokens.colors.primary, borderRadius: 6, },
    progressLabelRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, marginBottom: 14, }, 
    progressLabelText: { fontSize: 10, color: "rgba(0,0,0,0.50)", fontWeight: "500", lineHeight: 20, fontFamily: tokens.typography.fontFamily, },

    // Question card
    questionCard: { width: "100%", backgroundColor: "#fff", borderRadius: 20,},
    questionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 7, },
    qBadge: { width: 28, height: 28, borderRadius: 5, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", marginRight: 12, },
    qBadgeText: { color: "#fff", fontWeight: "700", fontFamily: tokens.typography.fontFamily, },
    questionText: { fontSize: 14, color: tokens.colors.ink, fontWeight: "700", lineHeight: 26, fontFamily: tokens.typography.fontFamily, marginTop: 7, },
    bottomSpacer: { height: 50, },
    
    // Closed mic button (웹 .mic-button)
    micButton: { position: "absolute", bottom: 34, left: "50%", transform: [{ translateX: -52.5 }], width: 105, height: 105, borderRadius: 999, backgroundColor: tokens.colors.primary,
    alignItems: "center", justifyContent: "center", },
    micIcon: { width: 40, height: 40, },

    // Recording sheet (웹 .recording-sheet)
    recordingSheet: { position: "absolute", left: 0, right: 0, bottom: 0, height: 360, backgroundColor: tokens.colors.primary, borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: "center", paddingTop: 32, },
    recordingSheetInner: { width: "100%", maxWidth: 480, paddingHorizontal: 30, alignItems: "center", },
    recordingMeter: { width: "100%", height: 100, backgroundColor: "#fff", borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 25, }, 
    recordingWave: { flexDirection: "row", alignItems: "center", height: 64, overflow: "hidden", gap: 5, },
    waveBar: { width: 4, height: 20, borderRadius: 999, backgroundColor: tokens.colors.primary, transformOrigin: "center", }, 
    recordingText: { marginTop: 0, marginBottom: 45, fontSize: 20, fontWeight: "700", color: "#fff", textAlign: "center", fontFamily: tokens.typography.fontFamily, },

    // Mic ring + button
    recordingMicRing: { position: "absolute", bottom: 20, width: 133, height: 133, borderRadius: 999, alignItems: "center", justifyContent: "center", },
    recordingMicRingActive: { backgroundColor: "rgba(70, 144, 255, 0.32)", },
    recordingMicRingDisabled: { backgroundColor: "#CCCCCC", },
    recordingMicBtn: { width: 105, height: 105, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", },
    recordingMicBtnActive: { 
        // 활성 스타일  
    },
    recordingMicBtnDisabled: { // 비활성
    },

    // Outro overlay
    outroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.50)", alignItems: "center", justifyContent: "center", },
    outroCard: { alignItems: "center", justifyContent: "center", },
    outroIcon: { width: 50, height: 50, borderRadius: 999, backgroundColor: tokens.colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 3,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 14 }, elevation: 6, },
    outroIconImg: { width: 40, height: 40, },
    outroText: { fontSize: 20, fontWeight: "700", color: tokens.colors.primary, lineHeight: 50, fontFamily: tokens.typography.fontFamily, },

    // Completed
    completedWrap: { flex: 1, paddingHorizontal: 20, paddingBottom: 50, backgroundColor: tokens.colors.bg, alignItems: "center", justifyContent: "center", },
    completionContent: { width: "100%", alignItems: "center", justifyContent: "center", marginTop: 0, },
    completionTitle: { fontSize: 24, fontWeight: "700", color: "#111", lineHeight: 28, marginBottom: 21, fontFamily: tokens.typography.fontFamily, },
    completionDesc: { fontSize: 16, fontWeight: "500", color: "rgba(0,0,0,0.50)", lineHeight: 28, textAlign: "center", fontFamily: tokens.typography.fontFamily, },

    // Loading dots
    loadingDots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11, marginBottom: 20, },
    loadingDot: { width: 12, height: 12, borderRadius: 999, backgroundColor: tokens.colors.primary, },
});
