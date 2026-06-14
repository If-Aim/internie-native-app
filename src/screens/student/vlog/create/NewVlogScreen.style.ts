import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    topbarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop:11, paddingHorizontal: 12, paddingBottom: 15, backgroundColor: "#F0F6FF" },
    appTitle: { fontSize: 16, fontWeight: "700", color: "#000", lineHeight: 20 },
    headerLeftSpace: { width: 40, height: 40 }, 

    scroll: { flex: 1 },
    content: { paddingHorizontal: 27, paddingTop: 11, paddingBottom: 160 },
    section: { marginBottom: 34 },
    sectionTitle: { marginBottom: 20, marginLeft: 10, fontSize: 20, fontWeight: "700", color: "#000", lineHeight: 24 },
    sectionDescription: { marginLeft: 10, marginBottom: 23, fontSize: 16, fontWeight: "700", color: "#5F5F5F", lineHeight: 20 },

    companyLoadingBox: { minHeight: 54, borderWidth: 1, borderColor: "#E2E2E2", borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
    companyEmptyBox: { minHeight: 54, borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
    companyEmptyText: { fontSize: 16, fontWeight: "700", color: "#5F5F5F", lineHeight: 22 },
    companyDropdownWrap: { position: "relative", zIndex: 20 },
    companyDropdownButton: { minHeight: 54, paddingLeft: 24, paddingRight: 16, borderWidth: 1, borderColor: "#E2E2E2", borderRadius: 10, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 3 },
    companyDropdownButtonOpen: { borderColor: "#E2E2E2" },
    companyDropdownText: { flex: 1, marginRight: 12, fontSize: 16, fontWeight: "500", color: "#6F6F6F", lineHeight: 20 },
    companyDropdownTextSelected: { color: "#000" },
    companyDropdownList: { position: "absolute", top: 48, left: 0, right: 0, paddingTop: 9, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#E2E2E2", borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: "#FFFFFF", overflow: "hidden", zIndex: 1 },
    companyDropdownListInner: { paddingVertical: 3 },
    companyDropdownItem: { minHeight: 51, marginHorizontal: 11, paddingHorizontal: 11, borderRadius: 10, justifyContent: "center" },
    companyDropdownItemActive: { backgroundColor: "#D9D9D9" },
    companyDropdownItemText: { fontSize: 16, fontWeight: "500", color: "#5F5F5F", lineHeight: 22 },
    companyDropdownItemTextActive: { color: "#5F5F5F", fontWeight: "500" },
    fixedPeriodText: { marginTop: 13, marginLeft: 23, fontSize: 16, fontWeight: "500", color: "#5F5F5F", lineHeight: 20 },

    nameInput: { height: 54, paddingHorizontal: 23, borderWidth: 1, borderColor: "#E2E2E2", borderRadius: 10, backgroundColor: "#FFFFFF", fontSize: 16, fontWeight: "400", color: "#000" },
    periodBox: { height: 64, paddingHorizontal: 23, borderWidth: 1, borderColor: "#E2E2E2", borderRadius: 10, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    dateChip: { minWidth: 96, height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: "#F1F1F1", alignItems: "center", justifyContent: "center" },
    dateChipText: { fontSize: 16, fontWeight: "500", color: "#808080", lineHeight: 20 },
    periodDash: { fontSize: 16, fontWeight: "500", color: "#808080", lineHeight: 20 },
    
    introCard: { marginHorizontal: 10, paddingTop: 16, paddingHorizontal: 10, paddingBottom: 14, borderWidth: 1, borderColor: "#E6E6E6", borderRadius: 10, backgroundColor: "#FFFFFF" },
    introTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
    videoThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#E6E6E6", alignItems: "center", justifyContent: "center" },
    videoThumbImage: { width: "100%", height: "100%", borderRadius: 8 },
    videoThumbActive: { backgroundColor: "#BDD8FF" },
    introTextWrap: { flex: 1, minWidth: 0, marginLeft: 14, opacity: 0.69, },
    introLabel: { fontSize: 16, fontWeight: "700", color: "#4F4F4F", lineHeight: 20 },
    introDuration: { marginTop: 7, fontSize: 24, fontWeight: "700", color: "#000", lineHeight: 28 },
    
    recordButton: { height: 48, borderRadius: 8, backgroundColor: "#BDD8FF", alignItems: "center", justifyContent: "center" },
    recordButtonText: { fontSize: 16, fontWeight: "700", color: "#0166FF", lineHeight: 20 },
    recordButtonActive: { backgroundColor: "#0166FF" },
    recordButtonTextActive: { color: "#FFFFFF" },
    bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 32, paddingTop: 18, paddingBottom: 50, backgroundColor: "#F0F6FF" },
    saveButton: { height: 60, borderRadius: 10, backgroundColor: "#E6E6E6", alignItems: "center", justifyContent: "center" },
    saveButtonText: { fontSize: 16, fontWeight: "700", color: "#808080", lineHeight: 28 },
    saveButtonActive: { backgroundColor: "#0166FF" },
    saveButtonTextActive: { color: "#fff" },
    nextButtonActive: { backgroundColor: "#BDD8FF" },
    nextButtonTextActive: { color: "#0166FF" },
    
    modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center" },
    modalDim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0, 0, 0, 0.35)" },
    calendarSheet: { width: "76%", paddingHorizontal: 26, paddingTop: 20, paddingBottom: 30, borderRadius: 20, backgroundColor: "#FFFFFF" },
    calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    calendarTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#000", lineHeight: 24, },
    calendarCloseButton: { width: 24, height: 44, alignItems: "center", justifyContent: "center" },
    
    monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 17 },
    monthArrowButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    monthText: { minWidth: 36, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#000", lineHeight: 24 },
    weekRow: { flexDirection: "row", marginBottom: 4 },
    weekText: { width: `${100 / 7}%`, textAlign: "center", fontSize: 14, fontWeight: "800", color: "#000", lineHeight: 24 },
    
    dayGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 42 },
    dayCell: { width: `${100 / 7}%`, height: 36, alignItems: "center", justifyContent: "center", position: "relative", overflow: "visible" },

    rangeFill: { position: "absolute", top: 2, bottom: 2, backgroundColor: "#BDD8FF" },
    rangeFillMiddle: { left: -1, right: -1 },
    rangeFillStart: { left: "50%", right: -1 },
    rangeFillEnd: { left: -1, right: "50%" },
    rangeFillRowStart: { left: -1, right: -1, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
    rangeFillRowEnd: { left: -1, right: -1, borderTopRightRadius: 16, borderBottomRightRadius: 16 },
    rangeFillSingle: { display: "none" },

    dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", zIndex: 1, overflow: "hidden" },
    dayCircleActive: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#0166FF" },
    dayText: { fontSize: 14, fontWeight: "700", color: "#000", lineHeight: 26 },
    dayTextActive: { color: "#FFFFFF" },
    dayTextInRange: { color: "#000" },

    calendarConfirmButton: { height: 72, borderRadius: 10, backgroundColor: "#0166FF", alignItems: "center", justifyContent: "center" },
    calendarConfirmText: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", lineHeight: 28 },

    cameraRoot: { flex: 1, backgroundColor: "transparent" },
    cameraPreview: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    cameraOverlay: { flex: 1, backgroundColor: "transparent" },

    cameraCloseButtonWrap: { position: "absolute", zIndex: 20 },
    cameraCloseIconBox: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

    cameraMissionCard: { position: "absolute", borderWidth: 1, borderColor: "#FFFFFF", borderRadius: 12, backgroundColor: "rgba(255, 255, 255, 0.20)", alignItems: "flex-start" },
    cameraMissionCardPortrait: { minHeight: 96, paddingHorizontal: 24, paddingVertical: 19 },
    cameraMissionCardLandscape: { minHeight: 96, paddingHorizontal: 24, paddingVertical: 19 },
    cameraMissionTitle: { fontSize: 16, fontWeight: "700", color: "#D9D9D9", lineHeight: 22, textAlign: "left" },
    cameraMissionDuration: { marginTop: 10, fontSize: 28, fontWeight: "700", color: "#FFFFFF", lineHeight: 34, textAlign: "left" },

    cameraFoldButtonInner: { flex: 1, width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
    cameraFoldButton: { position: "absolute", width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255, 255, 255, 0.24)", alignItems: "center", justifyContent: "center", zIndex: 20 },
    
    cameraRecordArea: { position: "absolute", alignItems: "center", justifyContent: "center" },
    cameraRecordAreaPortrait: { left: 0, right: 0, bottom: 60 },
    cameraRecordAreaLandscape: { right: 60, top: "50%", marginTop: -53 },

    recordCircleOuter: { width: 106, height: 106, borderRadius: 53, borderWidth: 5, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
    recordCircleInner: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#FF3838" },
    recordStopInner: { width: 54, height: 54, borderRadius: 5, backgroundColor: "#FF3838" },

});