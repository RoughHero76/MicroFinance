// App.js

import React from "react";
import Toast from "react-native-toast-message";
import { HomeProvider } from "./src/components/context/HomeContext";
import RootNavigator from "./src/components/navigation/RootNavigator";
import { PaperProvider } from 'react-native-paper';

const App = () => {
  return (
    <HomeProvider>
      <PaperProvider>
        <RootNavigator />
      </PaperProvider>
      <Toast />
    </HomeProvider>
  );
}

export default App