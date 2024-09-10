import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // import the icon package
import MenuScreen from '../../Screens/Home/MenuScreen.js';
import CustomerView from '../../Screens/Home/CustomerView/CustomerView.js';
import RepaymentSchedule from '../../Screens/Home/CustomerView/Loans/RepaymentSchedule.js';
import AllCustomerView from '../../Screens/Home/CustomerView/AllCustomerView.js';
import CustomerRegistration from '../../Screens/Home/CustomerView/CustomerRegistration.js';

import { View, TouchableOpacity } from 'react-native';

const AppStack = createNativeStackNavigator();

const AppNavigator = ({ navigation }) => (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="Menu" component={MenuScreen} />
        <AppStack.Screen name="CustomerView" component={CustomerView} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Customer View' }} />
        <AppStack.Screen name="RepaymentSchedule" component={RepaymentSchedule} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Repayment Schedule' }} />
        <AppStack.Screen name="CustomerRegistration" component={CustomerRegistration} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Customer Registration' }} />
        <AppStack.Screen
            name="AllCustomerView"
            component={AllCustomerView}
            options={({ navigation }) => ({
                headerShown: true,
                headerTitleAlign: 'center',
                headerTitle: 'All Customers',
                headerRight: () => (
                    <View>
                        <TouchableOpacity>
                            <Icon
                                name="account-plus" 
                                size={28}
                                color="black"
                                style={{ marginRight: 15 }}
                                onPress={() => navigation.navigate('CustomerRegistration')}
                            />
                        </TouchableOpacity>
                    </View>
                ),
            })}
        />
    </AppStack.Navigator>
);

export default AppNavigator;
