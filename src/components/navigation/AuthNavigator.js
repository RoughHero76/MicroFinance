//components/navigation/AuthNavigator.js

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import LoginScreen from '../../Screens/InitialScreens/Login/LoginScreen';
import WelcomeScreen from '../../Screens/InitialScreens/WelcomeScreen/WelcomeScreen';

const AuthStack = createNativeStackNavigator();

const AuthNavigator = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
        <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
);

export default AuthNavigator;