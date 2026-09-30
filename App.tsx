import React, {useEffect} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {HomeProvider} from './src/components/context/HomeContext';
import {UpdateProvider} from '@/features/app/updates';
import {SessionProvider} from '@/features/auth/SessionProvider';
import {loadSavedLanguage} from '@/i18n';
import {QueryProvider} from '@/lib/query';
import RootNavigator from '@/navigation/RootNavigator';
import {ThemeProvider} from '@/theme';
import {ToastHost} from '@/ui';

const App = () => {
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <SessionProvider>
              <UpdateProvider>
                {/* HomeProvider: the old screens' view of the session (until W6). */}
                <HomeProvider>
                  <BottomSheetModalProvider>
                    <RootNavigator />
                    {/* The one toast host, above navigation and sheets. */}
                    <ToastHost />
                  </BottomSheetModalProvider>
                </HomeProvider>
              </UpdateProvider>
            </SessionProvider>
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
