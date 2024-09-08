// App.js

import React from "react";
import Toast from "react-native-toast-message";
import { HomeProvider } from "./src/components/context/HomeContext";
import RootNavigator from "./src/components/navigation/RootNavigator";

const App = () => {
  return (
    <HomeProvider>
      <RootNavigator />
      <Toast />
    </HomeProvider>
  );
}

export default App