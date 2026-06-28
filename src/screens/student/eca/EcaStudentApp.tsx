import React from "react";
import { Alert, Animated, Easing, Pressable, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import AppText from "../../../../AppText";
import type { StudentStackParamList } from "../../../navigation/StudentNavigator";
import { ecaStudentAppStyles as styles } from "./EcaStudentApp.style";

type EcaStudentTab = "dashboard" | "assignment" | "attendance" | "leaderboard" | "team-activity";
type TabTransitionDirection = "forward" | "back";

type EcaStudentAppProps = {
    children: React.ReactNode;
    externalActivityId: string;
    activeTab: EcaStudentTab;
    overlay?: React.ReactNode;
    hideBottomNav?: boolean;
};

type BottomNavItem = {
    key: EcaStudentTab;
    labelKey: string;
    disabled: boolean;
};

const bottomNavItems: BottomNavItem[] = [
    { key: "dashboard", labelKey: "ecaStudent.appPage.bottomNav.dashboard", disabled: false },
    { key: "assignment", labelKey: "ecaStudent.appPage.bottomNav.assignment", disabled: false },
    { key: "attendance", labelKey: "ecaStudent.appPage.bottomNav.attendance", disabled: false },
    { key: "leaderboard", labelKey: "ecaStudent.appPage.bottomNav.leaderboard", disabled: false },
];

const tabOrder: EcaStudentTab[] = ["dashboard", "assignment", "attendance", "leaderboard"];

function getTabTransitionDirection(currentTab: EcaStudentTab, nextTab: EcaStudentTab): TabTransitionDirection {
    const currentIndex = tabOrder.indexOf(currentTab);
    const nextIndex = tabOrder.indexOf(nextTab);

    return nextIndex > currentIndex ? "forward" : "back";
}

function getTabIndex(tab: EcaStudentTab): number {
    return Math.max(tabOrder.indexOf(tab), 0);
}

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

    if (type === "leaderboard") {
        return (
            <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                <Path opacity="0.2" d="M27.108 25.9463C26.5539 26.044 25.9845 26.0068 25.4479 25.8377C24.9113 25.6686 24.4234 25.3727 24.0255 24.975L18.7617 19H21.5005C22.4496 19.001 23.3873 18.794 24.2477 18.3934C25.1082 17.9928 25.8703 17.4085 26.4804 16.6815C27.0906 15.9546 27.534 15.1027 27.7793 14.1858C28.0247 13.269 28.066 12.3095 27.9005 11.375L29.9455 21.8962C30.1054 22.8095 29.8964 23.7488 29.3644 24.5081C28.8324 25.2674 28.0209 25.7847 27.108 25.9463Z" fill={color}/>
                <Path d="M22.0003 14H19.0003C18.7351 14 18.4807 13.8946 18.2932 13.7071C18.1056 13.5196 18.0003 13.2652 18.0003 13C18.0003 12.7348 18.1056 12.4804 18.2932 12.2929C18.4807 12.1054 18.7351 12 19.0003 12H22.0003C22.2655 12 22.5199 12.1054 22.7074 12.2929C22.8949 12.4804 23.0003 12.7348 23.0003 13C23.0003 13.2652 22.8949 13.5196 22.7074 13.7071C22.5199 13.8946 22.2655 14 22.0003 14ZM13.0003 12H12.0003V11C12.0003 10.7348 11.8949 10.4804 11.7074 10.2929C11.5199 10.1054 11.2655 10 11.0003 10C10.7351 10 10.4807 10.1054 10.2932 10.2929C10.1056 10.4804 10.0003 10.7348 10.0003 11V12H9.00029C8.73507 12 8.48072 12.1054 8.29318 12.2929C8.10565 12.4804 8.00029 12.7348 8.00029 13C8.00029 13.2652 8.10565 13.5196 8.29318 13.7071C8.48072 13.8946 8.73507 14 9.00029 14H10.0003V15C10.0003 15.2652 10.1056 15.5196 10.2932 15.7071C10.4807 15.8946 10.7351 16 11.0003 16C11.2655 16 11.5199 15.8946 11.7074 15.7071C11.8949 15.5196 12.0003 15.2652 12.0003 15V14H13.0003C13.2655 14 13.5199 13.8946 13.7074 13.7071C13.8949 13.5196 14.0003 13.2652 14.0003 13C14.0003 12.7348 13.8949 12.4804 13.7074 12.2929C13.5199 12.1054 13.2655 12 13.0003 12ZM30.1853 25.0812C29.8084 25.6194 29.3183 26.0686 28.7493 26.3971C28.1803 26.7256 27.5462 26.9255 26.8917 26.9828C26.2372 27.0401 25.5781 26.9534 24.9606 26.7288C24.3432 26.5041 23.7825 26.147 23.3178 25.6825C23.3028 25.6675 23.2878 25.6525 23.274 25.6362L18.3103 20H13.6853L8.72654 25.6362L8.68279 25.6825C7.83804 26.5254 6.69365 26.9992 5.50029 27C4.84334 26.9998 4.1944 26.8557 3.59908 26.5779C3.00375 26.3001 2.47647 25.8953 2.05427 25.392C1.63208 24.8886 1.3252 24.299 1.15521 23.6644C0.985221 23.0298 0.956235 22.3657 1.07029 21.7188C1.0697 21.7129 1.0697 21.7071 1.07029 21.7013L3.11654 11.19C3.42108 9.45634 4.32686 7.88546 5.67473 6.75339C7.02261 5.62133 8.72633 5.0005 10.4865 5H21.5003C23.2552 5.0028 24.9537 5.62008 26.3009 6.74466C27.6481 7.86924 28.559 9.4301 28.8753 11.1562V11.1788L30.9215 21.7C30.9221 21.7058 30.9221 21.7117 30.9215 21.7175C31.0274 22.299 31.0169 22.8958 30.8905 23.4732C30.7641 24.0506 30.5244 24.5971 30.1853 25.0812ZM21.5003 18C22.959 18 24.3579 17.4205 25.3894 16.3891C26.4208 15.3576 27.0003 13.9587 27.0003 12.5C27.0003 11.0413 26.4208 9.64236 25.3894 8.61091C24.3579 7.57946 22.959 7 21.5003 7H10.4865C9.19523 7.00116 7.94569 7.45767 6.95775 8.28922C5.96982 9.12076 5.30678 10.2741 5.08529 11.5463V11.5625L3.03779 22.0737C2.94729 22.5949 3.02439 23.1313 3.25801 23.6058C3.49163 24.0803 3.86973 24.4685 4.33793 24.7145C4.80613 24.9606 5.3403 25.0518 5.86362 24.9751C6.38694 24.8983 6.87244 24.6576 7.25029 24.2875L12.4903 18.3388C12.5841 18.2323 12.6995 18.1471 12.8288 18.0886C12.9581 18.0302 13.0984 18 13.2403 18H21.5003ZM28.9628 22.0737L27.8703 16.4487C27.1984 17.5337 26.2607 18.4293 25.146 19.0508C24.0313 19.6722 22.7765 19.9989 21.5003 20H20.9753L24.7503 24.2887C25.0349 24.5656 25.3811 24.771 25.7605 24.8881C26.1399 25.0052 26.5416 25.0307 26.9328 24.9625C27.5844 24.8475 28.1638 24.4788 28.5441 23.9374C28.9244 23.3959 29.0745 22.7257 28.9615 22.0737H28.9628Z" fill={color}/>
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
    hideBottomNav = false,
}: EcaStudentAppProps): React.ReactElement {
    const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
    const route = useRoute();
    const { t } = useTranslation();
    const { width } = useWindowDimensions();
    const [bottomNavWidth, setBottomNavWidth] = React.useState(0);
    const [visualActiveTab, setVisualActiveTab] = React.useState(activeTab);
    const contentTranslateX = React.useRef(new Animated.Value(0)).current;
    const activeIndicatorProgress = React.useRef(new Animated.Value(getTabIndex(activeTab))).current;
    const movingRef = React.useRef(false);
    const routeParams = route.params as { tabTransitionDirection?: TabTransitionDirection } | undefined;
    const enterDirection = routeParams?.tabTransitionDirection;

    React.useEffect(() => {
        setVisualActiveTab(activeTab);
        activeIndicatorProgress.setValue(getTabIndex(activeTab));

        if (!enterDirection) {
            contentTranslateX.setValue(0);
            return;
        }

        contentTranslateX.setValue(enterDirection === "back" ? -width : width);
        Animated.timing(contentTranslateX, {
            toValue: 0,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(() => {
            movingRef.current = false;
        });
    }, [activeTab, activeIndicatorProgress, contentTranslateX, enterDirection, width]);

    const navInnerWidth = Math.max(bottomNavWidth - 78, 0);
    const navItemGap = Math.max((navInnerWidth - 64 * bottomNavItems.length) / (bottomNavItems.length - 1), 0);
    const activeIndicatorTranslateX = activeIndicatorProgress.interpolate({
        inputRange: bottomNavItems.map((_, index) => index),
        outputRange: bottomNavItems.map((_, index) => index * (64 + navItemGap)),
        extrapolate: "clamp",
    });

    function handlePress(item: BottomNavItem): void {
        if (item.disabled) {
            Alert.alert(t("common.preparing"));
            return;
        }

        if (item.key === activeTab) {
            return;
        }

        if (movingRef.current) {
            return;
        }

        const tabTransitionDirection = getTabTransitionDirection(activeTab, item.key);
        const exitTranslateX = tabTransitionDirection === "forward" ? -width : width;

        movingRef.current = true;
        setVisualActiveTab(item.key);

        Animated.parallel([
            Animated.timing(activeIndicatorProgress, {
                toValue: getTabIndex(item.key),
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(contentTranslateX, {
                toValue: exitTranslateX,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (!finished) {
                movingRef.current = false;
                return;
            }

            if (item.key === "dashboard") {
                navigation.navigate("EcaStudentDashboard", {
                    externalActivityId,
                    tabTransitionDirection,
                });
                return;
            }

            if (item.key === "assignment") {
                navigation.navigate("EcaStudentAssignment", {
                    externalActivityId,
                    tabTransitionDirection,
                });
                return;
            }

            if (item.key === "attendance") {
                navigation.navigate("EcaStudentMobileAttendance", {
                    externalActivityId,
                    tabTransitionDirection,
                });
                return;
            }

            if (item.key === "leaderboard") {
                navigation.navigate("EcaStudentLeaderboard", {
                    externalActivityId,
                    tabTransitionDirection,
                });
                return;
            }
        });

    }

    return (
        <View style={styles.shell}>
            <View style={styles.body}>
                <Animated.View style={[styles.animatedBody, { transform: [{ translateX: contentTranslateX }] }]}>
                    {children}
                </Animated.View>
            </View>

            {hideBottomNav ? null : (
                <View style={styles.bottomNavWrap}>
                    <SafeAreaView style={styles.bottomNavSafe} edges={["bottom"]}>
                        <View style={styles.bottomNav} onLayout={(event) => setBottomNavWidth(event.nativeEvent.layout.width)}>
                            <Animated.View style={[styles.bottomNavActiveIndicator, { transform: [{ translateX: activeIndicatorTranslateX }] }]} />
                            {bottomNavItems.map((item) => {
                                const active = visualActiveTab === item.key;
                                const color = active ? "#0166FF" : "#808080";

                                return (
                                    <Pressable key={item.key} style={styles.bottomNavItem} onPress={() => handlePress(item)}>
                                        <View style={styles.bottomNavIcon}>
                                            <BottomNavIcon type={item.key} color={color} />
                                        </View>

                                        <AppText style={[styles.bottomNavText, active ? styles.bottomNavTextActive : null]}>
                                            {t(item.labelKey)}
                                        </AppText>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </SafeAreaView>
                </View>
            )}
            {overlay}
        </View>
    );
}
