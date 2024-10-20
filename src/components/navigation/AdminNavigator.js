import React, { useState, useEffect } from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // import the icon package
import MenuScreen from '../../Screens/Home/MenuScreen.js';
import EditCustomerScreen from '../../Screens/Home/CustomerView/EditCustomerView.js';
import CustomerView from '../../Screens/Home/CustomerView/CustomerView.js';
import RepaymentSchedule from '../../Screens/Home/CustomerView/Loans/RepaymentSchedule.js';
import AllCustomerView from '../../Screens/Home/CustomerView/AllCustomerView.js';
import CustomerRegistration from '../../Screens/Home/CustomerView/CustomerRegistration.js';
import CreateLoan from '../../Screens/Home/CustomerView/Loans/CreateLoan.js';
import CloseLoan from '../../Screens/Home/CustomerView/Loans/CloseLoan.js';

//Reports
import ReportsScreen from '../../Screens/Home/Reports/ReportsScreen.js';

import LoanDetails from '../../Screens/Home/CustomerView/Loans/LoanDetails.js';
import LoansView from '../../Screens/Home/CustomerView/Loans/LoansView.js';

import { View, TouchableOpacity, Modal, Text, Pressable, StyleSheet } from 'react-native';
// import PaymentHistory from '../../Screens/Home/CustomerView/Loans/PaymentHistory.js'; (Putting it inside Shared screebs)
import PaymentHistory from '../../Screens/Shared/Customer/Loan/PaymentHistory.js';
import RepaymentApprovalScreen from '../../Screens/Home/CustomerView/RepaymentApprovalScreen.js';

/* Employee */
import AllEmployeeView from '../../Screens/Home/EmployeeView/AllEmployeeView.js';
import EmployeeRegistration from '../../Screens/Home/EmployeeView/EmployeeRegistration.js';
import EmployeeView from '../../Screens/Home/EmployeeView/EmployeeView.js';
//Shared
import SearchScreen from '../../Screens/Shared/Searching/SearchScreen.js';
import LoanCalculator from '../../Screens/Shared/LoanCalculator.js';
import About from '../../Screens/Shared/About.js';
// Share Profile
import ProfileScreen from '../../Screens/Shared/Profile/ProfileScreen.js';

// Permissions
import { Alert, Linking, Platform } from 'react-native';

import { PERMISSIONS } from 'react-native-permissions';
import GetPermission from '../permissions.js';

const AdminStack = createNativeStackNavigator();

const AdminNavigator = ({ navigation }) => {
    const [permissionsGranted, setPermissionsGranted] = useState(false);

    const permissionsToRequest = Platform.select({
        android: Platform.Version >= 33
            ? [
                PERMISSIONS.ANDROID.SEND_SMS,
                PERMISSIONS.ANDROID.RECEIVE_SMS,
                PERMISSIONS.ANDROID.READ_PHONE_STATE,
                PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
                PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
                PERMISSIONS.ANDROID.READ_MEDIA_AUDIO
            ]
            : Platform.Version >= 30
                ? [
                    PERMISSIONS.ANDROID.SEND_SMS,
                    PERMISSIONS.ANDROID.RECEIVE_SMS,
                    PERMISSIONS.ANDROID.READ_PHONE_STATE,
                    PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE
                ]
                : [
                    PERMISSIONS.ANDROID.SEND_SMS,
                    PERMISSIONS.ANDROID.RECEIVE_SMS,
                    PERMISSIONS.ANDROID.READ_PHONE_STATE,
                    PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
                    PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE
                ],
        ios: [] // Add relevant iOS permissions if necessary
    });

    useEffect(() => {
        const requestPermissions = async () => {
            try {
                for (const permission of permissionsToRequest) {
                    const granted = await GetPermission(permission);
                    if (!granted) {
                        console.log(`Permission ${permission} not granted`);
                        setPermissionsGranted(false);
                        return;
                    }
                }
                setPermissionsGranted(true);
            } catch (error) {
                console.error('Error requesting permissions:', error);
                setPermissionsGranted(false);
            }
        };

        requestPermissions();
    }, []);
    /*     if (!permissionsGranted) {
            // You could return a loading screen or some other placeholder here
            return null;
        } */
    return (
        <AdminStack.Navigator screenOptions={{ headerShown: false }}>

            <AdminStack.Screen name="Menu" component={MenuScreen} />

            {/* Custoemr And Loan */}
            <AdminStack.Screen name="CustomerView" component={CustomerView} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Customer View' }} />
            <AdminStack.Screen name="EditCustomer" component={EditCustomerScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Edit Customer' }} />
            <AdminStack.Screen name="RepaymentSchedule" component={RepaymentSchedule} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Repayment Schedule' }} />
            <AdminStack.Screen name="CustomerRegistration" component={CustomerRegistration} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Customer Registration' }} />
            <AdminStack.Screen name="CreateLoan" component={CreateLoan} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Create Loan' }} />
            <AdminStack.Screen name="LoanDetails" component={LoanDetails} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Loan Details' }} />
            <AdminStack.Screen name="PaymentHistory" component={PaymentHistory} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Payment History' }} />
            <AdminStack.Screen name="CloseLoan" component={CloseLoan} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Close Loan' }} />
            <AdminStack.Screen name="LoansView" component={LoansView} options={
                ({ navigation }) => ({
                    headerShown: true, headerTitleAlign: 'center', headerTitle: 'All Loans',
                    headerRight: () => (
                        <View>
                            <TouchableOpacity onPress={() => navigation.navigate('SearchScreen')}>
                                <Icon
                                    name="magnify"
                                    size={28}
                                    color="black"
                                    style={{ marginRight: 15 }} // Adjust margin for spacing
                                />
                            </TouchableOpacity>
                        </View>
                    ),
                })
            } />
            <AdminStack.Screen name="ReportsScreen" component={ReportsScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Reports' }} />
            <AdminStack.Screen
                name="AllEmployeeView"
                component={AllEmployeeView}
                options={({ navigation }) => ({
                    headerShown: true,
                    headerTitleAlign: 'center',
                    headerTitle: 'All Employees',
                    headerRight: () => (
                        <View>
                            <TouchableOpacity onPress={() => navigation.navigate('CustomerRegistration')}>
                                <Icon
                                    name="account-plus"
                                    size={28}
                                    color="black"
                                    style={{ marginRight: 15 }}
                                />
                            </TouchableOpacity>
                        </View>
                    ),
                })}
            />

            <AdminStack.Screen name="EmployeeView" component={EmployeeView} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Employee Profile' }} />

            {/* Others */}

            <AdminStack.Screen name="RepaymentApprovalScreen" component={RepaymentApprovalScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Repayment Approval' }} />


            {/* Shared */}
            <AdminStack.Screen name="SearchScreen" component={SearchScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Search' }} />
            <AdminStack.Screen name="LoanCalculator" component={LoanCalculator} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Loan Calculator' }} />
            <AdminStack.Screen name="About" component={About} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'About' }} />
            {/* Profile */}
            <AdminStack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Profile' }} />

            {/* Employee Mangement */}

            <AdminStack.Screen name="EmployeeRegistration" component={EmployeeRegistration} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Employee Registration' }} />

            <AdminStack.Screen
                name="AllCustomerView"
                component={AllCustomerView}
                options={({ navigation }) => ({
                    headerShown: true,
                    headerTitleAlign: 'center',
                    headerTitle: 'All Customers',
                    headerRight: () => (
                        <View style={{ flexDirection: 'row' }}>
                            {/* Search Icon */}
                            <TouchableOpacity onPress={() => navigation.navigate('SearchScreen')}>
                                <Icon
                                    name="magnify"
                                    size={28}
                                    color="black"
                                    style={{ marginRight: 15 }} // Adjust margin for spacing
                                />
                            </TouchableOpacity>
                            {/* Add Customer Icon */}
                            <TouchableOpacity onPress={() => navigation.navigate('CustomerRegistration')}>
                                <Icon
                                    name="account-plus"
                                    size={28}
                                    color="black"
                                    style={{ marginRight: 15 }}
                                />
                            </TouchableOpacity>

                        </View>
                    ),
                })}
            />

        </AdminStack.Navigator>
    )
};

export default AdminNavigator;