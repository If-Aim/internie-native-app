// src/screens/student/mypage/CertificatesScreen.tsx
import React from "react";
import PdfThumbnail from "react-native-pdf-thumbnail";
import ReactNativeBlobUtil from "react-native-blob-util";
import FileViewer from "react-native-file-viewer"
import Share from "react-native-share"
import { View, Text, Pressable, Image, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { ApiError, type AdminUserFile, getMyAdminFiles, getMyAdminFileDownloadUrl } from "../../../api/client";

import { Screen } from "../../../components/Screen";
import { styles } from "./Certificates.style";

function getFileType(filename: string) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "jpg" || ext === "jpeg" || ext === "png") return "image";
    if (ext === "pdf") return "pdf";
    return "other";
}
function getExt(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext || "";
}

function getMimeByExt(ext: string) {
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "application/octet-stream";
}

type PreviewMap = Record<number, { kind: "image" | "pdf" | "other"; uri?: string; localPdfPath?: string }>;

export default function CertificatesScreen({ navigation }: NativeStackScreenProps<StudentStackParamList, "Certificates">) {
    const [items, setItems] = React.useState<AdminUserFile[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
    const [downloadingId, setDownloadingId] = React.useState<number | null>(null);
    const [previewMap, setPreviewMap] = React.useState<PreviewMap>({});

    const handleClose = () => { navigation.goBack(); };

    async function downloadToCache(signedUrl: string, filename: string, fileId: number) {
        const { fs } = ReactNativeBlobUtil;
        const cacheDir = fs.dirs.CacheDir;

        const ext = getExt(filename) || "bin";
        const safeName = filename.replace(/[\\/:*?"<>|]/g, "_"); // 윈도우 금지문자 방어
        const localPath = `${cacheDir}/cert_${fileId}_${safeName}`;

        // 이미 있으면 재사용 (원하시면 항상 새로 받도록 exists 체크 제거)
        const exists = await fs.exists(localPath);
        if (exists) return { localPath, ext };

        await ReactNativeBlobUtil.config({
            path: localPath,
            fileCache: true,
        }).fetch("GET", signedUrl);

        return { localPath, ext };
    }

    // signedUrl Pdf 파일 로컬 다운로드 함수
    async function downloadPdfToCache(signedUrl: string, fileId: number): Promise<string> {
        const { fs } = ReactNativeBlobUtil;
        const cacheDir = fs.dirs.CacheDir;

        const localPath = `${cacheDir}/cert_${fileId}.pdf`;

        const exists = await fs.exists(localPath);
        if (exists) return localPath;

        await ReactNativeBlobUtil.config({
            path: localPath,
            fileCache: true,
        }).fetch("GET", signedUrl);

        return localPath;
    }

    // pdf 썸네일 생성 함수 
    async function makePdfThumb(localPdfPath: string): Promise<string> {
        const result = await PdfThumbnail.generate(localPdfPath, 0);

        const uri =
            (result as any)?.uri ||
            (result as any)?.path ||
            (result as any)?.thumbnail ||
            "";

        if (!uri) throw new Error("pdf thumbnail uri not found");

        return uri.startsWith("file://") ? uri : `file://${uri}`;
    }

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                const list = await getMyAdminFiles();
                if (!mounted) return;

                setItems(Array.isArray(list) ? list : []);
            } catch (e) {
                if (!mounted) return;

                if (e instanceof ApiError && e.status === 404) {
                    setItems([]);
                    setErrorMsg(null);
                } else {
                    setErrorMsg("수료증 목록을 불러오지 못했습니다.");
                    console.error(e);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (items.length === 0) return;

        let cancelled = false;

        (async () => {
            try {
                const results = await Promise.all(
                    items.map(async (item) => {
                    try {
                        const signedUrl = await getMyAdminFileDownloadUrl(item.fileId);
                        const type = getFileType(item.filename);

                        if (type === "image") {
                            return { fileId: item.fileId, preview: { kind: "image" as const, uri: signedUrl } };
                        }

                        if (type === "pdf") {
                            const localPdfPath = await downloadPdfToCache(signedUrl, item.fileId);
                            const thumbUri = await makePdfThumb(localPdfPath);

                            return {
                                fileId: item.fileId,
                                preview: { kind: "pdf" as const, uri: thumbUri, localPdfPath },
                            };
                        }

                        return { fileId: item.fileId, preview: { kind: "other" as const } };
                    } catch {
                        return null;
                    }
                    })
                );

                if (cancelled) return;

                setPreviewMap((prev) => {
                    const next: PreviewMap = { ...prev };
                    results.forEach((r) => {
                        if (!r) return;
                        next[r.fileId] = r.preview;
                    });
                    return next;
                });
            } catch (e) {
                console.error("미리보기 로딩 실패", e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [items]);


    const handleDownload = React.useCallback(
        async (file: AdminUserFile) => {
            if (downloadingId != null) return;

            setDownloadingId(file.fileId);
            try {
                const signedUrl = await getMyAdminFileDownloadUrl(file.fileId);
                const { localPath, ext } = await downloadToCache(signedUrl, file.filename, file.fileId);
                const openPath = Platform.OS === "ios" ? `file://${localPath}` : localPath;

                Alert.alert(
                    "수료증",
                    "어떻게 처리할까요?",
                    [
                        {
                            text: "미리보기",
                            onPress: async () => {
                                try {
                                    await FileViewer.open(openPath, { showOpenWithDialog: true });
                                } catch (e) {
                                    Alert.alert("미리보기 실패", "파일을 열 수 없습니다.");
                                }
                            },
                        },
                        {
                            text: "공유",
                            onPress: async () => {
                                try {
                                    const mime = getMimeByExt(ext);
                                    await Share.open({
                                        url: Platform.OS === "android" ? `file://${localPath}` : openPath,
                                        type: mime,
                                        failOnCancel: false,
                                    });
                                } catch {
                                    Alert.alert("공유 실패", "공유를 진행할 수 없습니다.");
                                }
                            },
                        },
                        { text: "닫기", style: "cancel" },
                    ], { cancelable: true }
                );
            } catch (e) {
                if (e instanceof ApiError) {
                    if (e.status === 404) Alert.alert("발급된 수료증이 없습니다.");
                    else Alert.alert("다운로드 실패", e.bodyText ? e.bodyText : "다운로드에 실패했습니다.");
                } else {
                    Alert.alert("다운로드 실패", "다운로드에 실패했습니다.");
                }
            } finally {
                setDownloadingId(null);
            }
        }, [downloadingId]
    );


    return (
        <Screen style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ width: 44, height: 44 }} />
                <Text style={styles.headerTitle}>수료증</Text>
                <Pressable style={styles.headerClose} accessibilityLabel="close" onPress={handleClose}>
                    <Image source={require("../../../assets/icons/x-01.png")} style={styles.headerIcon} />
                </Pressable>
            </View>

            {/* Body */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
            >
                {loading ? (
                    <View style={styles.emptyWrap}>
                        <ActivityIndicator />
                        <Text style={styles.emptyText}>불러오는 중…</Text>
                    </View>
                ) : errorMsg ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>{errorMsg}</Text>
                    </View>
                ) : items.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>발급된 수료증이 없습니다.</Text>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {items.map((item) => {
                        const pv = previewMap[item.fileId];
                        const isDownloading = downloadingId === item.fileId;

                            return (
                                <View key={item.fileId} style={styles.card}>
                                    <View style={styles.thumb}>
                                        {pv?.uri ? (
                                            <Image source={{ uri: pv.uri }} style={styles.thumbImg} resizeMode="cover" />
                                        ) : pv?.kind === "pdf" ? (
                                            <View style={styles.thumbPdf}>
                                                <Text style={styles.thumbPdfText}>PDF</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.thumbPlaceholder} />
                                        )}

                                    </View>

                                    <View style={styles.info}>
                                        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                                            {item.filename}
                                        </Text>
                                        <Text style={styles.date} numberOfLines={1}>
                                            {/* TODO: 날짜 표시 */}
                                        </Text>
                                    </View>

                                    <View style={styles.actions}>
                                        <Pressable
                                        style={styles.iconBtn}
                                        accessibilityLabel="다운로드"
                                        onPress={() => void handleDownload(item)}
                                        disabled={isDownloading}
                                        >
                                        <Image
                                            source={
                                            isDownloading
                                                ? require("../../../assets/icons/download-02-blue.png")
                                                : require("../../../assets/icons/download-02.png")
                                            }
                                            style={styles.icon24}
                                        />
                                        </Pressable>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </Screen>
    );
}
