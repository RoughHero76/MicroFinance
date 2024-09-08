import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';
import { useHomeContext } from '../context/HomeContext';
import { View, Image, StyleSheet } from 'react-native';
import SplashScreen from '../SplashScreen';


const RootNavigator = () => {
  const { isLoggedIn, isLoading } = useHomeContext();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      // Add a slight delay before hiding the splash screen
      setTimeout(() => {
        setShowSplash(false);
      }, 1000);
    }
  }, [isLoading]);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isLoggedIn ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // or whatever color your splash screen background is
  },
  splashImage: {
    width: '80%',
    height: '100%',
    resizeMode: 'contain',

  },
});

export default RootNavigator;