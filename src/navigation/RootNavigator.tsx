// App start (S1–S4): Splash while the session loads (at least a second, as
// before), Login when signed out, Quick unlock when locked, the permissions
// explainer once after the first login, then the role's tabs.

import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import {NavigationContainer, type NavigationContainerRef} from '@react-navigation/native';
import {useSession} from '@/features/auth/SessionProvider';
import LockScreen from '@/features/auth/screens/LockScreen';
import LoginScreen from '@/features/auth/screens/LoginScreen';
import PermissionsScreen from '@/features/auth/screens/PermissionsScreen';
import SplashScreen from '@/features/auth/screens/SplashScreen';
import {CrashBoundary, flushPendingReports, setCurrentScreen} from '@/features/app/crash';
import UpdateSheet from '@/features/app/UpdateSheet';
import {readJson, writeJson} from '@/lib/storage';
import {navigationTheme, useTheme} from '@/theme';
import {OfflineBanner} from '@/ui';
import AdminNavigator from './AdminNavigator';
import EmployeeNavigator from './EmployeeNavigator';

const PERMISSIONS_SEEN = 'onboarding.permissionsSeen';
const MIN_SPLASH_MS = 1000;

export default function RootNavigator() {
  const theme = useTheme();
  const {status, role} = useSession();
  const [splashDone, setSplashDone] = useState(false);
  const [permissionsSeen, setPermissionsSeen] = useState<boolean | null>(null);
  const navRef = useRef<NavigationContainerRef<ReactNavigation.RootParamList>>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    readJson<boolean>(PERMISSIONS_SEEN, false).then(setPermissionsSeen);
    flushPendingReports();
    return () => clearTimeout(timer);
  }, []);

  if (status === 'loading' || !splashDone || permissionsSeen === null) return <SplashScreen />;
  if (status === 'signedOut') return <LoginScreen />;
  if (status === 'locked') return <LockScreen />;
  if (!permissionsSeen) {
    return (
      <PermissionsScreen
        onDone={() => {
          writeJson(PERMISSIONS_SEEN, true);
          setPermissionsSeen(true);
        }}
      />
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: theme.colors.bg}}>
      <NavigationContainer
        ref={navRef}
        theme={navigationTheme(theme)}
        onStateChange={() => setCurrentScreen(navRef.current?.getCurrentRoute()?.name)}>
        <CrashBoundary onReset={() => navRef.current?.reset({index: 0, routes: [{name: 'Tabs' as never}]})}>
          {role === 'admin' ? <AdminNavigator /> : <EmployeeNavigator />}
        </CrashBoundary>
      </NavigationContainer>
      <OfflineBanner />
      <UpdateSheet />
    </View>
  );
}
