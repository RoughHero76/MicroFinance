// For the few real full-screen overlays (image viewer). A native Modal opens a
// separate window on Android, so it mounts its own ToastHost to keep toasts
// visible above it.

import React from 'react';
import {Modal, type ModalProps} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {ToastHost} from './Toast';

export function AppModal({children, ...props}: ModalProps & {children: React.ReactNode}) {
  return (
    <Modal statusBarTranslucent animationType="fade" {...props}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{flex: 1}}>
          {children}
          <ToastHost />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
}
