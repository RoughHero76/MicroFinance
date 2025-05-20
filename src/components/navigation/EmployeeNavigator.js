import { useState, useEffect } from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MenuScreenEmployee from "../../Screens/EmployeeHome/Home/MenuScreen";

import TodaysCollectionScreen from "../../Screens/EmployeeHome/Home/Collections/TodaysCollectionScreen";


import AllCustomerView from "../../Screens/EmployeeHome/Home/Customers/AllCustomers";
import CustomerView from "../../Screens/EmployeeHome/Home/Customers/CustomerView";

//Loans
import RepaymentSchedule from "../../Screens/EmployeeHome/Home/Customers/Loans/RepaymentSchedule";
import LoanDetailsScreen from "../../Screens/EmployeeHome/Home/Customers/Loans/LoanDetalis.js";

//Shared Screens
import SearchScreen from "../../Screens/Shared/Searching/SearchScreen";
import PaymentHistory from "../../Screens/Shared/Customer/Loan/PaymentHistory";
import LoanCalculator from "../../Screens/Shared/LoanCalculator";
import About from "../../Screens/Shared/About.js";
import LoanStatusDetailsScreen from "../../Screens/Shared/Report/LoanStatusDetailsScreen.js";

//Profile
import ProfileScreen from "../../Screens/Shared/Profile/ProfileScreen";

import { Platform, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from "@react-navigation/native";

//Leads

import LeadListScreen from "../../Screens/Shared/Leads/EmployeeLeadScreen.js";
import CreateLeadScreen from "../../Screens/Shared/Leads/EmployeeCreateLead.js";
import LeadDetailsScreen from "../../Screens/Shared/Leads/EmployeeLeadDetails.js";

// Permissions
import { PERMISSIONS } from 'react-native-permissions';
import GetPermission from '../permissions.js';

const EmployeeStack = createNativeStackNavigator();




const EmployeeNavigator = () => {

    const navigation = useNavigation();
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
    return (
        <EmployeeStack.Navigator screenOptions={{ headerShown: false }}>
            <EmployeeStack.Screen name="MenuScreenEmployee" component={MenuScreenEmployee} />
            <EmployeeStack.Screen name="TodaysCollectionScreen" component={TodaysCollectionScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Todays Collection' }} />
            <EmployeeStack.Screen name="AllCustomerView" component={AllCustomerView} options={{
                headerShown: true, headerTitleAlign: 'center', headerTitle: 'All Customers', headerRight: () => {
                    return (
                        <>
                            <TouchableOpacity style={styles.searchButton}
                                onPress={() => navigation.navigate('SearchScreen')}
                            >
                                <Icon name="magnify" size={24} color="#000" />
                            </TouchableOpacity>
                        </>
                    )
                }
            }} />

            <EmployeeStack.Screen name="LoanStatusDetails" component={LoanStatusDetailsScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Loan Status Details' }} />

            <EmployeeStack.Screen name="CustomerView" component={CustomerView} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Customer Details' }} />
            <EmployeeStack.Screen name="SearchScreen" component={SearchScreen} options={{
                headerShown: true, headerTitleAlign: 'center', headerTitle: 'Search'

            }} />
            <EmployeeStack.Screen name="PaymentHistory" component={PaymentHistory} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Payment History' }} />
            <EmployeeStack.Screen name="RepaymentSchedule" component={RepaymentSchedule} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Repayment Schedule' }} />
            <EmployeeStack.Screen name="LoanDetailsScreen" component={LoanDetailsScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Loan Details' }} />

            <EmployeeStack.Screen name="LeadListScreen" component={LeadListScreen} options={{
                headerShown: true, headerTitleAlign: 'center', headerTitle: 'Leads', headerRight: () => {
                    return (
                        <>
                            <TouchableOpacity style={styles.searchButton}
                                onPress={() => navigation.navigate('CreateLeadScreen')}
                            >
                                <Icon name="plus" size={24} color="#000" />
                            </TouchableOpacity>
                        </>
                    )
                }
            }} />

            <EmployeeStack.Screen name="LeadDetailsScreen" component={LeadDetailsScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Lead Details' }} />
            <EmployeeStack.Screen name="CreateLeadScreen" component={CreateLeadScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Create Lead' }} />

            <EmployeeStack.Screen name="LoanCalculator" component={LoanCalculator} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Loan Calculator' }} />
            <EmployeeStack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Profile' }} />
            <EmployeeStack.Screen name="About" component={About} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'About' }} />
        </EmployeeStack.Navigator>
    )
}

const styles = StyleSheet.create({
    searchButton: {
        marginRight: 10,
    },
})

export default EmployeeNavigator