import React from "react";
import { HomeProvider } from "./src/components/context/HomeContext";
import { UpdateProvider } from "./src/components/context/UpdateContext";
import RootNavigator from "./src/components/navigation/RootNavigator";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import UpdateNotification from "./src/components/UpdateNotification";
import { CustomToast } from "./src/components/toast/CustomToast";
import ErrorBoundary from "./src/components/ErrorBoundary";

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HomeProvider>
          <UpdateProvider>
            <ErrorBoundary>
              <RootNavigator />
            </ErrorBoundary>
            <UpdateNotification />
            <CustomToast />
          </UpdateProvider>
        </HomeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;