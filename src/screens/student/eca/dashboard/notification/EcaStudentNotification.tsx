import React from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import messaging from "@react-native-firebase/messaging";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppText from "../../../../../../AppText";
import type { StudentStackParamList } from "../../../../../navigation/StudentNavigator";
import { deleteAllNotifications, getNotifications, markNotificationRead, } from "../../../../../api/ea";
import type { NotificationResponse } from "../../../../../api/ea";
import { getUserTimeZone, parseServerKstDateTime, } from "../../../../../theme/dateTime";

import EcaStudentApp from "../../EcaStudentApp";
import { EcaBackExitTransitionView, useEcaBackExitTransition } from "../../EcaBackExitTransition";
import { styles } from "./EcaStudentNotification.style";

type Props = NativeStackScreenProps<StudentStackParamList, "EcaStudentNotification">;

type NotificationGroup = {
    dateKey: string;
    dateLabel: string;
    notifications: NotificationResponse[];
};

function getDatePart(parts: Intl.DateTimeFormatPart[], type: string): string {
    return parts.find((part) => part.type === type)?.value ?? "00";
}

function getSafeDate(value?: string | null): Date | null {
    return parseServerKstDateTime(value);
}

function isEnglishLanguage(language: string): boolean {
    return language.toLowerCase().startsWith("en");
}

function getDateKey(value: string): string {
    const date = getSafeDate(value);

    if (!date) return "unknown";

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: getUserTimeZone(),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = getDatePart(parts, "year");
    const month = getDatePart(parts, "month");
    const day = getDatePart(parts, "day");

    return `${year}-${month}-${day}`;
}

function formatNotificationDate(value: string, language: string): string {
    const date = getSafeDate(value);

    if (!date) return "-";

    if (isEnglishLanguage(language)) {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: getUserTimeZone(),
            weekday: "short",
            month: "short",
            day: "numeric",
        }).format(date);
    }

    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: getUserTimeZone(),
        month: "long",
        day: "numeric",
        weekday: "short",
    }).format(date);
}

function sortNotifications(a: NotificationResponse, b: NotificationResponse): number {
    return (getSafeDate(b.createdAt)?.getTime() ?? 0) - (getSafeDate(a.createdAt)?.getTime() ?? 0);
}

function isCurrentActivityNotification(notification: NotificationResponse, externalActivityId?: string): boolean {
    if (!externalActivityId) return true;
    if (!notification.externalActivityId) return true;

    return String(notification.externalActivityId) === externalActivityId;
}

function groupNotifications(notifications: NotificationResponse[], language: string): NotificationGroup[] {
    const groupMap = new Map<string, NotificationGroup>();

    notifications.forEach((notification) => {
        const dateKey = getDateKey(notification.createdAt);
        const group = groupMap.get(dateKey) ?? {
            dateKey,
            dateLabel: formatNotificationDate(notification.createdAt, language),
            notifications: [],
        };

        group.notifications.push(notification);
        groupMap.set(dateKey, group);
    });

    return Array.from(groupMap.values());
}

function getLocalizedNotificationTitle(notification: NotificationResponse, language: string): string {
    if (isEnglishLanguage(language)) {
        return notification.titleEn?.trim()
            || notification.title?.trim()
            || notification.titleKo?.trim()
            || "-";
    }

    return notification.titleKo?.trim()
        || notification.title?.trim()
        || notification.titleEn?.trim()
        || "-";
}

function getLocalizedNotificationBody(notification: NotificationResponse, language: string): string {
    if (isEnglishLanguage(language)) {
        return notification.bodyEn?.trim()
            || notification.body?.trim()
            || notification.bodyKo?.trim()
            || "-";
    }

    return notification.bodyKo?.trim()
        || notification.body?.trim()
        || notification.bodyEn?.trim()
        || "-";
}

function getNotificationMessage(notification: NotificationResponse, language: string): string {
    const body = getLocalizedNotificationBody(notification, language);
    const title = getLocalizedNotificationTitle(notification, language);

    return body !== "-" ? body : title;
}

function BackIcon(): React.ReactElement {
    return (
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M14 17L9 12L14 7" stroke="#000000" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function TrashIcon({ disabled }: { disabled: boolean }): React.ReactElement {
    const color = disabled ? "#B8B8B8" : "#000000";

    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M3 6H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
            <Path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M19 6L18.2 19.2C18.1365 20.2479 17.2678 21 16.218 21H7.782C6.73218 21 5.86346 20.2479 5.8 19.2L5 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M10 11V16M14 11V16" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

function Header({
    title,
    deleting,
    canDelete,
    onBackClick,
    onDeleteAllClick,
}: {
    title: string;
    deleting: boolean;
    canDelete: boolean;
    onBackClick: () => void;
    onDeleteAllClick: () => void;
}): React.ReactElement {
    const { t } = useTranslation();

    return (
        <View style={styles.topbarRow}>
            <Pressable style={styles.headerIconButton} onPress={onBackClick} accessibilityLabel="back">
                <BackIcon />
            </Pressable>

            <AppText style={styles.headerTitle} numberOfLines={1}>
                {title}
            </AppText>

            <Pressable
                style={styles.headerIconButton}
                onPress={onDeleteAllClick}
                disabled={!canDelete || deleting}
                accessibilityLabel={t("ecaStudent.notificationPage.deleteAll")}
            >
                <TrashIcon disabled={!canDelete || deleting} />
            </Pressable>
        </View>
    );
}

export default function EcaStudentNotification({
    route,
    navigation,
}: Props): React.ReactElement {
    const { t, i18n } = useTranslation();
    const externalActivityId = route.params?.externalActivityId;
    const { screenExitStyle, runBackExitTransition } = useEcaBackExitTransition(() => navigation.goBack());

    const [notifications, setNotifications] = React.useState<NotificationResponse[]>([]);
    const [deleting, setDeleting] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

    const currentLanguage = i18n.resolvedLanguage ?? i18n.language;

    const notificationGroups = React.useMemo(
        () => groupNotifications(notifications, currentLanguage),
        [notifications, currentLanguage]
    );

    const fetchNotifications = React.useCallback(async (): Promise<void> => {
        setLoading(true);
        setError("");

        try {
            const data = await getNotifications({ page: 0, size: 50 });
            const nextNotifications = data.notifications
                .filter((notification) => isCurrentActivityNotification(notification, externalActivityId))
                .sort(sortNotifications);

            setNotifications(nextNotifications);
        } catch (e) {
            console.error(e);
            setNotifications([]);
            setError(t("ecaStudent.notificationPage.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [externalActivityId, t]);

    useFocusEffect(
        React.useCallback(() => {
            void fetchNotifications();
        }, [fetchNotifications])
    );

    React.useEffect(() => {
        const unsubscribe = messaging().onMessage(async () => {
            await fetchNotifications();
        });

        return unsubscribe;
    }, [fetchNotifications]);

    function handleBackClick(): void {
        runBackExitTransition();
    }

    function navigateNotificationTarget(notification: NotificationResponse): void {
        const activityId = String(notification.externalActivityId ?? externalActivityId ?? "");
        const targetType = String(notification.targetType ?? "").toUpperCase();

        if (!activityId) return;

        if (
            targetType.includes("LEADERBOARD") ||
            notification.type === "LEADERBOARD_MISSION_APPROVED" ||
            notification.type === "LEADERBOARD_MISSION_REJECTED"
        ) {
            navigation.navigate("EcaStudentLeaderboard", {
                externalActivityId: activityId,
            });
            return;
        }

        if (
            notification.targetId &&
            (
                targetType.includes("ASSIGNMENT") ||
                notification.type === "ASSIGNMENT_CREATED" ||
                notification.type === "ASSIGNMENT_EVALUATED"
            )
        ) {
            navigation.navigate("EcaStudentAssignmentSubmit", {
                externalActivityId: activityId,
                assignmentId: String(notification.targetId),
            });
            return;
        }

        if (
            notification.targetId &&
            (
                targetType.includes("ATTENDANCE") ||
                notification.type === "ATTENDANCE_CHECK_IN_OPENED"
            )
        ) {
            navigation.navigate("EcaStudentMobileAttendanceSubmit", {
                externalActivityId: activityId,
                eventId: String(notification.targetId),
            });
            return;
        }

        navigation.navigate("EcaStudentDashboard", {
            externalActivityId: activityId,
        });
    }

    async function handleNotificationClick(notification: NotificationResponse): Promise<void> {
        if (!notification.read) {
            try {
                const updatedNotification = await markNotificationRead(notification.notificationId);

                setNotifications((prev) =>
                    prev.map((item) =>
                        item.notificationId === updatedNotification.notificationId
                            ? updatedNotification
                            : item
                    )
                );
            } catch (e) {
                console.error(e);
            }
        }

        navigateNotificationTarget(notification);
    }

    async function handleDeleteAll(): Promise<void> {
        if (notifications.length === 0 || deleting) return;

        setDeleteConfirmOpen(false);
        setDeleting(true);
        setError("");

        try {
            await deleteAllNotifications();
            setNotifications([]);
        } catch (e) {
            console.error(e);
            setError(t("ecaStudent.notificationPage.deleteAllFailed"));
        } finally {
            setDeleting(false);
        }
    }

    function renderDeleteConfirmModal(): React.ReactElement {
        return (
            <Modal visible={deleteConfirmOpen} transparent animationType="fade" onRequestClose={() => setDeleteConfirmOpen(false)}>
                <Pressable style={styles.confirmBackdrop} onPress={() => setDeleteConfirmOpen(false)}>
                    <Pressable style={styles.confirmSheet} onPress={() => {}}>
                        <AppText style={styles.confirmTitle}>
                            {t("ecaStudent.notificationPage.deleteAll")}
                        </AppText>

                        <AppText style={styles.confirmMessage}>
                            {t("ecaStudent.notificationPage.deleteAllConfirm")}
                        </AppText>

                        <View style={styles.confirmActions}>
                            <Pressable style={styles.confirmCancelButton} onPress={() => setDeleteConfirmOpen(false)}>
                                <AppText style={styles.confirmCancelText}>
                                    {t("common.cancel")}
                                </AppText>
                            </Pressable>

                            <Pressable style={styles.confirmDeleteButton} onPress={handleDeleteAll}>
                                <AppText style={styles.confirmDeleteText}>
                                    {t("common.delete")}
                                </AppText>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    }

    return (
        <EcaBackExitTransitionView exitStyle={screenExitStyle}>
            <EcaStudentApp externalActivityId={externalActivityId ?? ""} activeTab="dashboard" hideBottomNav>
                <SafeAreaView style={styles.page}>
                <Header
                    title={t("ecaStudent.notificationPage.title")}
                    deleting={deleting}
                    canDelete={notifications.length > 0}
                    onBackClick={handleBackClick}
                    onDeleteAllClick={() => setDeleteConfirmOpen(true)}
                />

                <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                    {loading ? (
                        <View style={styles.emptyWrap}>
                            <ActivityIndicator color="#0166FF" />
                        </View>
                    ) : error ? (
                        <View style={styles.emptyWrap}>
                            <AppText style={styles.emptyText}>{error}</AppText>
                        </View>
                    ) : notificationGroups.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <AppText style={styles.emptyText}>
                                {t("ecaStudent.notificationPage.empty")}
                            </AppText>
                        </View>
                    ) : (
                        notificationGroups.map((group) => (
                            <View style={styles.group} key={group.dateKey}>
                                <AppText style={styles.groupTitle}>
                                    {group.dateLabel}
                                </AppText>

                                <View style={styles.list}>
                                    {group.notifications.map((notification) => (
                                        <Pressable
                                            key={notification.notificationId}
                                            style={[
                                                styles.item,
                                                notification.read ? styles.itemRead : null,
                                            ]}
                                            onPress={() => handleNotificationClick(notification)}
                                        >
                                            <AppText style={styles.itemText}>
                                                {getNotificationMessage(notification, currentLanguage)}
                                            </AppText>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>

                {renderDeleteConfirmModal()}
                </SafeAreaView>
            </EcaStudentApp>
        </EcaBackExitTransitionView>
    );
}
