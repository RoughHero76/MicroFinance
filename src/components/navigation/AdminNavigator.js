import React, { useState, useEffect } from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // import the icon package
import MenuScreen from '../../Screens/Home/MenuScreen.js';
import CustomerView from '../../Screens/Home/CustomerView/CustomerView.js';
import RepaymentSchedule from '../../Screens/Home/CustomerView/Loans/RepaymentSchedule.js';
import AllCustomerView from '../../Screens/Home/CustomerView/AllCustomerView.js';
import CustomerRegistration from '../../Screens/Home/CustomerView/CustomerRegistration.js';
import CreateLoan from '../../Screens/Home/CustomerView/Loans/CreateLoan.js';
import CloseLoan from '../../Screens/Home/CustomerView/Loans/CloseLoan.js';

import LoanDetails from '../../Screens/Home/CustomerView/Loans/LoanDetails.js';
import { View, TouchableOpacity } from 'react-native';
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
// Share Profile
import ProfileScreen from '../../Screens/Shared/Profile/ProfileScreen.js';

// Permissions
import GetPermission from '../permissions.js';

const AdminStack = createNativeStackNavigator();

const AdminNavigator = ({ navigation }) => {
    const [permissionsGranted, setPermissionsGranted] = useState(false);

    const permissionsToRequest = Platform.select({
        android: [
            'android.permission.SEND_SMS',
            'android.permission.RECEIVE_SMS',
            'android.permission.READ_PHONE_STATE',
            'android.permission.WRITE_EXTERNAL_STORAGE'
        ],
        ios: [] // Add relevant iOS permissions if necessary
    });

    useEffect(() => {
        const requestPermissions = async () => {
            for (const permission of permissionsToRequest) {
                const granted = await GetPermission(permission);
                if (!granted) {
                    // Handle the case where a permission is not granted
                    console.log(`Permission ${permission} not granted`);
                    return;
                }
            }
            setPermissionsGranted(true);
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
            <AdminStack.Screen name="RepaymentSchedule" component={RepaymentSchedule} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Repayment Schedule' }} />
            <AdminStack.Screen name="CustomerRegistration" component={CustomerRegistration} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Customer Registration' }} />
            <AdminStack.Screen name="CreateLoan" component={CreateLoan} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Create Loan' }} />
            <AdminStack.Screen name="LoanDetails" component={LoanDetails} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Loan Details' }} />
            <AdminStack.Screen name="PaymentHistory" component={PaymentHistory} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Payment History' }} />
            <AdminStack.Screen name="CloseLoan" component={CloseLoan} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Close Loan' }} />
            <AdminStack.Screen
                name="AllEmployeeView"
                component={AllEmployeeView}
                options={({ navigation }) => ({
                    headerShown: true,
                    headerTitleAlign: 'center',
                    headerTitle: 'All Employees',
                    headerRight: () => (
                        <View>
                            <TouchableOpacity>
                                <Icon
                                    name="account-plus"
                                    size={28}
                                    color="black"
                                    style={{ marginRight: 15 }}
                                    onPress={() => navigation.navigate('EmployeeRegistration')}
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

        </AdminStack.Navigator>
    )
};

export default AdminNavigator;
