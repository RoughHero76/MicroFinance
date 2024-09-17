import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MenuScreenEmployee from "../../Screens/EmployeeHome/Home/MenuScreen";

import TodaysCollectionScreen from "../../Screens/EmployeeHome/Home/Collections/TodaysCollectionScreen";


import AllCustomerView from "../../Screens/EmployeeHome/Home/Customers/AllCustomers";
import CustomerView from "../../Screens/EmployeeHome/Home/Customers/CustomerView";

//Loans
import PaymentHistory from "../../Screens/Shared/Customer/Loan/PaymentHistory";

//Shared Screens
import SearchScreen from "../../Screens/Shared/Searching/SearchScreen";
const EmployeeStack = createNativeStackNavigator();


const EmployeeNavigator = () => (
    <EmployeeStack.Navigator screenOptions={{ headerShown: false }}>
        <EmployeeStack.Screen name="MenuScreenEmployee" component={MenuScreenEmployee} />
        <EmployeeStack.Screen name="TodaysCollectionScreen" component={TodaysCollectionScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Todays Collection' }} />
        <EmployeeStack.Screen name="AllCustomerView" component={AllCustomerView} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'All Customers' }} />
        <EmployeeStack.Screen name="CustomerView" component={CustomerView} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Customer Details' }} />
        <EmployeeStack.Screen name="SearchScreen" component={SearchScreen} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Search' }} />
        <EmployeeStack.Screen name="PaymentHistory" component={PaymentHistory} options={{ headerShown: true, headerTitleAlign: 'center', headerTitle: 'Payment History' }} />
    </EmployeeStack.Navigator>
);

export default EmployeeNavigator