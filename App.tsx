import React from "react";
import { HomeProvider } from "./src/components/context/HomeContext";
import { UpdateProvider } from "./src/components/context/UpdateContext";
import RootNavigator from "./src/components/navigation/RootNavigator";
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import UpdateNotification from "./src/components/UpdateNotification";
import { CustomToast } from "./src/components/toast/CustomToast";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { eviPaperTheme } from "./src/theme/paperTheme";

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={eviPaperTheme}>
        <HomeProvider>
          <UpdateProvider>
            <ErrorBoundary>
              <RootNavigator />
            </ErrorBoundary>
            <UpdateNotification />
            <CustomToast />
          </UpdateProvider>
        </HomeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default App;