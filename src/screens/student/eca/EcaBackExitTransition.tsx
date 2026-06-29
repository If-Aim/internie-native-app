import React from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions } from "react-native";

export function useEcaBackExitTransition(onComplete: () => void) {
    const { width } = useWindowDimensions();
    const progress = React.useRef(new Animated.Value(0)).current;
    const runningRef = React.useRef(false);
    const onCompleteRef = React.useRef(onComplete);

    React.useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const runBackExitTransition = React.useCallback((): void => {
        if (runningRef.current) return;

        runningRef.current = true;

        Animated.timing(progress, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                onCompleteRef.current();
            }
        });
    }, [progress]);

    const resetBackExitTransition = React.useCallback((): void => {
        runningRef.current = false;
        progress.setValue(0);
    }, [progress]);

    const screenExitStyle = React.useMemo(() => ({
        opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
        }),
        transform: [
            {
                translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, width],
                }),
            },
        ],
    }), [progress, width]);

    return {
        screenExitStyle,
        runBackExitTransition,
        resetBackExitTransition,
    };
}

export function EcaBackExitTransitionView({
    children,
    exitStyle,
}: {
    children: React.ReactNode;
    exitStyle: ReturnType<typeof useEcaBackExitTransition>["screenExitStyle"];
}): React.ReactElement {
    return (
        <Animated.View style={[styles.screen, exitStyle]}>
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
});
