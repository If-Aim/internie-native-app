import React from "react";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "./src/i18n";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App(): React.ReactElement {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AppNavigator />
        </GestureHandlerRootView>
    );
}