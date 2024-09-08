//components/navigation/AppNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MenuScreen from '../../Screens/Home/MenuScreen.js';
import CustomerView from '../../Screens/Home/CustomerView/CustomerView.js';
import RepaymentSchedule from '../../Screens/Home/CustomerView/Loans/RepaymentSchedule.js';

const AppStack = createNativeStackNavigator();

const AppNavigator = () => (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="Menu" component={MenuScreen} />
        <AppStack.Screen name="CustomerView" component={CustomerView} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Customer View' }}  />
        <AppStack.Screen name="RepaymentSchedule" component={RepaymentSchedule} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Repayment Schedule' }}  />
    
    </AppStack.Navigator>
);

export default AppNavigator;