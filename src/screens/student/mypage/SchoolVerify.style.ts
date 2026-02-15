import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: { backgroundColor: "#EEF3FB", },
  header: { height: 56, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", },
  closeIcon: { width: 24, height: 24, },

  body: { flex: 1, alignItems: "center", paddingTop: 24, paddingHorizontal: 20, },
  title: { marginBottom: 58, fontSize: 18, fontWeight: "700", color: "#000", textAlign: "center", lineHeight: 25, },
  
  searchWrap: { width: "100%", maxWidth: 520, position: "relative", }, 
  input: { width: "100%", height: 61, borderRadius: 10, backgroundColor: "#fff", paddingLeft: 20, paddingRight: 44, fontSize: 16,
  shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 4, },
  searchWrapOpen: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 4, },
  inputOpen: { color: "#707070", borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, shadowOpacity: 0, elevation: 0, },

  rightIcon: { position: "absolute", right: 18, top: 30, width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 999, }, 
  rightIconCheck: { backgroundColor: "#0166FF",}, 
  rightIconImg: { width: 24, height: 24, },
  dropdown: { width: "100%", },
  item: { paddingVertical: 14, paddingHorizontal: 20, },
  itemText: { fontSize: 15, color: "#000", },

  footer: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 24, },
  footerUpload: { flexDirection: "column", gap: 12 as any, },
  footerBtn: { width: "100%", }, 
  primaryBtn: { width: "100%", height: 60, borderRadius: 10, backgroundColor: "#0166FF", alignItems: "center", justifyContent: "center", },
  primaryBtnDisabled: { opacity: 0.5, },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", },

  secondaryBtn: { width: "100%", height: 54, borderRadius: 14, backgroundColor: "rgba(11, 99, 255, 0.18)", alignItems: "center", justifyContent: "center", },
  secondaryBtnText: { color: "#0166FF", fontSize: 16, fontWeight: "700", },

  primaryAltBtn: { width: "100%", height: 54, borderRadius: 10, backgroundColor: "#0166FF", alignItems: "center", justifyContent: "center", },
  cardPreview: { width: "100%", maxWidth: 520, marginTop: 8, alignItems: "center", justifyContent: "center", },
  previewGuide: { width: 292, height: 220, },

  errorText: { width: "100%", maxWidth: 520, marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "rgba(255, 0, 0, 0.08)", color: "rgba(160, 0, 0, 0.9)", fontSize: 13, fontWeight: "500", },
  doneBody: { paddingTop: 84, },
  doneBox: { width: "100%", maxWidth: 520, alignItems: "center", justifyContent: "center", marginTop: 18, },
  doneCard: { width: "100%", height: 170, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6, },
  doneCardText: { color: "rgba(0,0,0,0.35)", fontSize: 14, },
  doneImg: { width: "100%", height: 160, borderRadius: 16, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6, },

  hint: { marginTop: 14, fontSize: 12, color: "rgba(0,0,0,0.45)", textAlign: "center", lineHeight: 18, },

  linkBtn: { paddingVertical: 6, alignSelf: "center", },
  linkText: { color: "rgba(0,0,0,0.6)", fontSize: 13, textDecorationLine: "underline", },
  submittingRow: { flexDirection: "row", alignItems: "center", gap: 10 as any, },
});
