import React from "react";
import { Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import AppText from "../../../../AppText";
import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { ecaStudentAppStyles as styles } from "./EcaStudentApp.style";

type EcaStudentTab = "dashboard" | "assignment" | "attendance" | "team-activity";

type EcaStudentAppProps = {
    children: React.ReactNode;
    externalActivityId: string;
    activeTab: EcaStudentTab;
    overlay?: React.ReactNode;
};

type BottomNavItem = {
    key: EcaStudentTab;
    label: string;
    disabled: boolean;
};

const bottomNavItems: BottomNavItem[] = [
    { key: "dashboard", label: "대시보드", disabled: false },
    { key: "assignment", label: "과제 제출", disabled: false },
    { key: "attendance", label: "출석 확인", disabled: true },
    { key: "team-activity", label: "팀 활동", disabled: true },
];

function BottomNavIcon({
    type,
    color,
}: {
    type: EcaStudentTab;
    color: string;
}): React.ReactElement {
    if (type === "dashboard") {
        return (
            <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                <Path d="M19.9247 28.1175V4.88281C19.9247 4.33053 19.477 3.88281 18.9247 3.88281H12.847C12.2948 3.88281 11.847 4.33053 11.847 4.88281V28.1175M19.9247 28.1175L19.9225 14.0243C19.9224 13.472 20.3701 13.0241 20.9225 13.0241H27C27.5523 13.0241 28 13.4719 28 14.0241V27.1175C28 27.6698 27.5523 28.1175 27 28.1175H19.9247ZM19.9247 28.1175H11.847M11.847 28.1175V21.1175C11.847 20.5652 11.3993 20.1175 10.847 20.1175H5C4.44771 20.1175 4 20.5652 4 21.1175V27.1175C4 27.6698 4.44771 28.1175 5 28.1175H11.847Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        );
    }

    if (type === "assignment") {
        return (
            <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                <Path d="M3.20157 11.2221L3.20144 24.5879C3.20142 25.6925 4.09686 26.5879 5.20143 26.5879L26.7997 26.588C27.9043 26.588 28.7997 25.6926 28.7997 24.588L28.8002 10.3498C28.8002 9.79754 28.3525 9.3498 27.8002 9.3498H16.1118L12.4251 5.41162H4.20057C3.64814 5.41162 3.20036 5.85813 3.20054 6.41057C3.20095 7.65588 3.20158 9.79409 3.20157 11.2221Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        );
    }

    if (type === "attendance") {
        return (
            <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                <Path d="M28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16C4 9.37258 9.37258 4 16 4C17.8827 4 19.6642 4.43358 21.25 5.20635M25.75 8.5L15.25 19L12.25 16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        );
    }

    return (
        <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
            <Path d="M25.6002 18.2476C27.29 19.5101 28.8002 22.6889 28.8002 24.6475C28.8002 25.2577 28.355 25.7523 27.8058 25.7523H27.2002M20.8002 13.0726C21.8933 12.4402 22.6288 11.2584 22.6288 9.9047C22.6288 8.55104 21.8933 7.36916 20.8002 6.73682M4.19456 25.7523H21.7106C22.2598 25.7523 22.705 25.2577 22.705 24.6475C22.705 20.812 19.5006 17.7027 12.9526 17.7027C6.40455 17.7027 3.2002 20.812 3.2002 24.6475C3.2002 25.2577 3.64539 25.7523 4.19456 25.7523ZM16.6097 9.9047C16.6097 11.9245 14.9724 13.5618 12.9526 13.5618C10.9328 13.5618 9.29543 11.9245 9.29543 9.9047C9.29543 7.88492 10.9328 6.24756 12.9526 6.24756C14.9724 6.24756 16.6097 7.88492 16.6097 9.9047Z" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

export default function EcaStudentApp({
    children,
    externalActivityId,
    activeTab,
    overlay,
}: EcaStudentAppProps): React.ReactElement {
    const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();

    function handlePress(item: BottomNavItem): void {
        if (item.disabled) {
            Alert.alert("서비스 준비중입니다.");
            return;
        }

        if (item.key === "dashboard") {
            navigation.navigate("EcaStudentDashboard", {
                externalActivityId,
            });
            return;
        }

        if (item.key === "assignment") {
            navigation.navigate("EcaStudentAssignment", {
                externalActivityId,
            });
        }
    }

    return (
        <View style={styles.shell}>
            <View style={styles.body}>
                {children}
            </View>

            <SafeAreaView style={styles.bottomNavSafe} edges={["bottom"]}>
                <View style={styles.bottomNav}>
                    {bottomNavItems.map((item) => {
                        const active = activeTab === item.key;
                        const color = active ? "#0166FF" : "#808080";

                        return (
                            <Pressable key={item.key} style={styles.bottomNavItem} onPress={() => handlePress(item)}>
                                <View style={[styles.bottomNavIcon, active ? styles.bottomNavIconActive : null]}>
                                    <BottomNavIcon type={item.key} color={color} />
                                </View>

                                <AppText style={[styles.bottomNavText, active ? styles.bottomNavTextActive : null]}>
                                    {item.label}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>
            </SafeAreaView>
            {overlay}
        </View>
    );
}