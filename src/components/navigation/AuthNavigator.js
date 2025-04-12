//components/navigation/AuthNavigator.js

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import LoginScreen from '../../Screens/InitialScreens/Login/LoginScreen';

const AuthStack = createNativeStackNavigator();

const AuthNavigator = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
);

export default AuthNavigator;