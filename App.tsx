import React, {useEffect} from 'react';
import {StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
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
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <SessionProvider>
              <UpdateProvider>
                <BottomSheetModalProvider>
                  <RootNavigator />
                  {/* The one toast host, above navigation and sheets. */}
                  <ToastHost />
                </BottomSheetModalProvider>
              </UpdateProvider>
            </SessionProvider>
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({root: {flex: 1}});

export default App;
