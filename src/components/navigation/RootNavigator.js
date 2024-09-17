import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './AuthNavigator';
import AdminNavigator from './AdminNavigator';
import EmployeeNavigator from './EmployeeNavigator';
import { useHomeContext } from '../context/HomeContext';
import SplashScreen from '../SplashScreen';

const RootNavigator = () => {
  const { isLoggedIn, isLoading, userRole } = useHomeContext();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        setShowSplash(false);
      }, 1000);
    }
  }, [isLoading]);

  if (showSplash) {
    return <SplashScreen />;
  }

  console.log('isLoggedIn:', isLoggedIn, 'userRole:', userRole);
  return (
    <NavigationContainer>
      {isLoggedIn ? (
        userRole === 'admin' ? (
          <AdminNavigator />
        ) : userRole === 'employee' ? (
          <EmployeeNavigator />
        ) : (
          <AuthNavigator /> 
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;