import React from "react";
import Toast from "react-native-toast-message";
import { HomeProvider } from "./src/components/context/HomeContext";
import { UpdateProvider } from "./src/components/context/UpdateContext";
import RootNavigator from "./src/components/navigation/RootNavigator";
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import UpdateNotification from "./src/components/UpdateNotification";
import { CustomToast } from "./src/components/toast/CustomToast";

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <HomeProvider>
          <UpdateProvider>
            <RootNavigator />
            <UpdateNotification />
            <Toast />
            <CustomToast />
          </UpdateProvider>
        </HomeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default App;