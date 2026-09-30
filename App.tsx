import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { HomeProvider } from './src/components/context/HomeContext';
import { UpdateProvider } from './src/components/context/UpdateContext';
import RootNavigator from './src/components/navigation/RootNavigator';
import UpdateNotification from './src/components/UpdateNotification';
import { CustomToast } from './src/components/toast/CustomToast';
import ErrorBoundary from './src/components/ErrorBoundary';
import { loadSavedLanguage } from '@/i18n';
import { QueryProvider } from '@/lib/query';
import { ThemeProvider } from '@/theme';
import { ToastHost } from '@/ui';

const App = () => {
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <BottomSheetModalProvider>
              <HomeProvider>
                <UpdateProvider>
                  <ErrorBoundary>
                    <RootNavigator />
                  </ErrorBoundary>
                  <UpdateNotification />
                  <CustomToast />
                </UpdateProvider>
              </HomeProvider>
              <ToastHost />
            </BottomSheetModalProvider>
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
