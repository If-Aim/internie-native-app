import React from "react";
import { Alert, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppText from "../../../../../AppText";
import { addVlogExtraClip } from "../../../../api/vlog";
import type { StudentStackParamList } from "../../../../navigation/StudentNavigator";
import { commonStyles } from "../../../../theme/common.Style";
import { styles } from "./SelectClipScreen.style";

type Props = NativeStackScreenProps<StudentStackParamList, "SelectClip">;

type SelectClipItem = {
    id: string;
    thumbnailUri: string | null;
    selected: boolean;
};

const CLIPS: SelectClipItem[] = Array.from({ length: 18 }, (_, index) => ({
    id: `gallery-${index + 1}`,
    thumbnailUri: null,
    selected: false,
}));

function BackIcon(): React.ReactElement {
    return (
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18L9 12L15 6" stroke="#05070A" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function CheckIcon(): React.ReactElement {
    return (
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M7 12L10.4 15.4L17 8.6" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

export default function SelectClipScreen({ navigation, route }: Props): React.ReactElement {
    const projectId = route.params.projectId;
    const title = route.params?.title ?? "인턴십";
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [saving, setSaving] = React.useState(false);

    function toggleClip(clipId: string): void {
        setSelectedIds((prev) => {
            if (prev.includes(clipId)) {
                return prev.filter((id) => id !== clipId);
            }

            return [...prev, clipId];
        });
    }

    async function handlePressAdd(): Promise<void> {
        if (saving || selectedIds.length === 0) return;

        try {
            setSaving(true);

            for (const id of selectedIds) {
                await addVlogExtraClip(projectId, {
                    fileKey: `vlogs/temp/${projectId}/extra-${id}-${Date.now()}.mp4`,
                    originalName: `${id}.mp4`,
                    contentType: "video/mp4",
                    sizeBytes: 0,
                    durationSeconds: 3,
                    thumbnailKey: null,
                    customTitle: "추가 영상",
                });
            }

            Alert.alert("추가되었습니다.", "선택한 영상이 편집 목록에 추가되었습니다.", [
                {
                    text: "확인",
                    onPress: () => navigation.goBack(),
                },
            ]);
        } catch (error) {
            console.error("[SELECT_CLIP] add extra clip error:", error);
            Alert.alert("추가 실패", "영상을 추가하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    }

    function renderClip({ item }: { item: SelectClipItem }): React.ReactElement {
        const selected = selectedIds.includes(item.id);

        return (
            <Pressable style={styles.clipTile} onPress={() => toggleClip(item.id)}>
                <View style={styles.clipThumbnail} />

                {selected && (
                    <View style={styles.selectedBadge}>
                        <CheckIcon />
                    </View>
                )}
            </Pressable>
        );
    }

    return (
        <SafeAreaView style={commonStyles.appRoot} edges={["top", "bottom"]}>
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="뒤로가기">
                    <BackIcon />
                </Pressable>

                <AppText style={styles.headerTitle}>{title}</AppText>

                <View style={styles.headerRight} />
            </View>

            <FlatList
                data={CLIPS}
                keyExtractor={(item) => item.id}
                numColumns={3}
                style={styles.list}
                contentContainerStyle={styles.content}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                renderItem={renderClip}
            />

            {selectedIds.length > 0 && (
                <View style={styles.bottomBar}>
                    <Pressable style={styles.addButton} onPress={handlePressAdd}>
                        <AppText style={styles.addButtonText}>{saving ? "추가 중..." : "추가하기"}</AppText>
                    </Pressable>
                </View>
            )}
        </SafeAreaView>
    );
}