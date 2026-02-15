// src/screens/student/mypage/UserModify.style.ts
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    screen: {
        // 컴포넌트 전용 보정만
    },

    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", },
    header: { height: 56, justifyContent: "center", alignItems: "center", position: "relative", paddingHorizontal: 20, },
    headerTitle: { fontSize: 16, fontWeight: "700", color: "#000", },
    headerClose: { position: "absolute", right: 10, top: 8, width: 40, height: 40, alignItems: "center", justifyContent: "center", },
    headerCloseIcon: { width: 24, height: 24, },
    
    body: { paddingHorizontal: 20, paddingTop: 23, paddingBottom: 30, },
    top: { alignItems: "center", gap: 18 as any, },
    
    avatarWrap: { width: 120, height: 120, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: "#DFDFDF", alignItems: "center", justifyContent: "center", },
    avatar: { width: 102, height: 102, borderRadius: 51, },
    avatarBtn: { minWidth: 60, height: 44, paddingHorizontal: 22, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: "#E3E3E3", },
    avatarBtnDisabled: { opacity: 0.6, },
    avatarBtnText: { fontSize: 16, fontWeight: "700", color: "#707070", }, 
    
    form: { marginTop: 28, gap: 30 as any, },
    field: { gap: 10 as any, },
    label: { marginLeft: 19, fontSize: 16, fontWeight: "500", color: "#000", }, 
    input: { height: 64, paddingHorizontal: 19, borderRadius: 10, borderWidth: 1, borderColor: "#DFDFDF", backgroundColor: "#fff", fontSize: 16, color: "rgba(0,0,0,0.5)", },
    inputReadonly: { backgroundColor: "rgba(255,255,255,0.7)", color: "#9AA3AF", }, 

    bottom: { paddingHorizontal: 20, paddingBottom: 20, },
    saveBtn: { height: 60, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#0166FF", },
    saveBtnDisabled: { backgroundColor: "#F1F1F1", }, 
    saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff", },
    saveBtnTextDisabled: { color: "#A2A2A2", },

    errorText: { marginTop: 8, marginLeft: 12, fontSize: 14, fontWeight: "700", color: "#000", },
    profileEditSaveDisabled: { backgroundColor: "#F1F1F1", },
    profileEditSaveText: { fontSize: 16, fontWeight: "700", color: "#fff",},
});
