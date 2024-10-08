import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MenuScreenEmployee from "../../Screens/EmployeeHome/Home/MenuScreen";

import TodaysCollectionScreen from "../../Screens/EmployeeHome/Home/Collections/TodaysCollectionScreen";


import AllCustomerView from "../../Screens/EmployeeHome/Home/Customers/AllCustomers";
import CustomerView from "../../Screens/EmployeeHome/Home/Customers/CustomerView";

//Loans
import RepaymentSchedule from "../../Screens/EmployeeHome/Home/Customers/Loans/RepaymentSchedule";

//Shared Screens
import SearchScreen from "../../Screens/Shared/Searching/SearchScreen";
import PaymentHistory from "../../Screens/Shared/Customer/Loan/PaymentHistory";
import LoanCalculator from "../../Screens/Shared/LoanCalculator";
//Profile
import ProfileScreen from "../../Screens/Shared/Profile/ProfileScreen";

const EmployeeStack = createNativeStackNavigator();




const EmployeeNavigator = () => (
    <EmployeeStack.Navigator screenOptions={{ headerShown: false }}>
        <EmployeeStack.Screen name="MenuScreenEmployee" component={MenuScreenEmployee} />
        <EmployeeStack.Screen name="TodaysCollectionScreen" component={TodaysCollectionScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Todays Collection' }} />
        <EmployeeStack.Screen name="AllCustomerView" component={AllCustomerView} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'All Customers' }} />
        <EmployeeStack.Screen name="CustomerView" component={CustomerView} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Customer Details' }} />
        <EmployeeStack.Screen name="SearchScreen" component={SearchScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Search' }} />
        <EmployeeStack.Screen name="PaymentHistory" component={PaymentHistory} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Payment History' }} />
        <EmployeeStack.Screen name="RepaymentSchedule" component={RepaymentSchedule} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Repayment Schedule' }} />
        <EmployeeStack.Screen name="LoanCalculator" component={LoanCalculator} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Loan Calculator' }} />
        <EmployeeStack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Profile' }} />
    </EmployeeStack.Navigator>
);

export default EmployeeNavigator