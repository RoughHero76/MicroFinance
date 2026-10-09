// Admin: 5 tabs + More (U-01).

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import KitGallery from '@/dev/KitGallery';
import OverdueListScreen from '@/features/collect/screens/OverdueListScreen';
import CustomerFormScreen from '@/features/customers/screens/CustomerFormScreen';
import CustomerListScreen from '@/features/customers/screens/CustomerListScreen';
import CustomerProfileScreen from '@/features/customers/screens/CustomerProfileScreen';
import SearchScreen from '@/features/customers/screens/SearchScreen';
import AdminHomeScreen from '@/features/dashboard/screens/AdminHomeScreen';
import LeadDetailScreen from '@/features/leads/screens/LeadDetailScreen';
import LeadListScreen from '@/features/leads/screens/LeadListScreen';
import AdminLoanScreen from '@/features/loans/screens/AdminLoanScreen';
import CloseLoanScreen from '@/features/loans/screens/CloseLoanScreen';
import CalculatorScreen from '@/features/loans/screens/CalculatorScreen';
import CreateLoanScreen from '@/features/loans/screens/CreateLoanScreen';
import LoansScreen from '@/features/loans/screens/LoansScreen';
import NotificationsScreen from '@/features/notifications/screens/NotificationsScreen';
import SendNotificationScreen from '@/features/notifications/screens/SendNotificationScreen';
import PaymentsScreen from '@/features/payments/screens/PaymentsScreen';
import PerformanceScreen from '@/features/reports/screens/PerformanceScreen';
import ReportsScreen from '@/features/reports/screens/ReportsScreen';
import RiskScreen from '@/features/reports/screens/RiskScreen';
import CashHandoversScreen from '@/features/cash/screens/CashHandoversScreen';
import DiagnosticsScreen from '@/features/settings/screens/DiagnosticsScreen';
import AboutScreen from '@/features/settings/screens/AboutScreen';
import ActivityScreen from '@/features/settings/screens/ActivityScreen';
import BusinessSettingsScreen from '@/features/settings/screens/BusinessSettingsScreen';
import MoreScreen from '@/features/settings/screens/MoreScreen';
import ProfileScreen from '@/features/settings/screens/ProfileScreen';
import SecurityScreen from '@/features/settings/screens/SecurityScreen';
import SettingsScreen from '@/features/settings/screens/SettingsScreen';
import SupportScreen from '@/features/settings/screens/SupportScreen';
import EmployeeFormScreen from '@/features/staff/screens/EmployeeFormScreen';
import EmployeeProfileScreen from '@/features/staff/screens/EmployeeProfileScreen';
import LoginsScreen from '@/features/staff/screens/LoginsScreen';
import EmployeesScreen from '@/features/staff/screens/EmployeesScreen';
import {useTheme} from '@/theme';
import {AppTabBar} from './AppTabBar';
import {useAdminNav} from './navItems';
import {stackScreenOptions, tabOptions, tabScreenOptions} from './shell';
import {withSplit} from './SplitView';
import type {AdminTabParamList, AppStackParamList} from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

// Wide web windows show a list and its detail side by side (SplitView);
// everywhere else these are the plain lists.
const CustomersList = withSplit(CustomerListScreen, {Customer: CustomerProfileScreen, Loan: AdminLoanScreen});
const LoansList = withSplit(LoansScreen, {Loan: AdminLoanScreen, Customer: CustomerProfileScreen});
const LeadsList = withSplit(LeadListScreen, {Lead: LeadDetailScreen});
const EmployeesList = withSplit(EmployeesScreen, {Employee: EmployeeProfileScreen});

function AdminMore() {
  const {work} = useAdminNav();
  return <MoreScreen work={work} />;
}

const TAB_SCREENS: Record<keyof AdminTabParamList, React.ComponentType<any>> = {
  Home: AdminHomeScreen,
  Customers: CustomersList,
  Loans: LoansList,
  Leads: LeadsList,
  More: AdminMore,
};

function AdminTabs() {
  const theme = useTheme();
  const {tabs} = useAdminNav();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions(theme)} tabBar={props => <AppTabBar {...props} />}>
      {tabs
        .filter(tab => tab.visible !== false)
        .map(tab => (
          <Tab.Screen key={tab.name} name={tab.name} component={TAB_SCREENS[tab.name]} options={tabOptions(tab)} />
        ))}
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="Tabs" component={AdminTabs} />
      <Stack.Screen name="Customer" component={CustomerProfileScreen} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Lead" component={LeadDetailScreen} />
      <Stack.Screen name="Employees" component={EmployeesList} />
      <Stack.Screen name="Employee" component={EmployeeProfileScreen} />
      <Stack.Screen name="Logins" component={LoginsScreen} />
      <Stack.Screen name="EmployeeLoans" component={LoansScreen} />
      <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
      <Stack.Screen name="Loan" component={AdminLoanScreen} />
      <Stack.Screen name="CreateLoan" component={CreateLoanScreen} />
      <Stack.Screen name="CloseLoan" component={CloseLoanScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="Activity" component={ActivityScreen} />
      <Stack.Screen name="BusinessSettings" component={BusinessSettingsScreen} />
      <Stack.Screen name="Overdue" component={OverdueListScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="SendNotification" component={SendNotificationScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Performance" component={PerformanceScreen} />
      <Stack.Screen name="Risk" component={RiskScreen} />
      <Stack.Screen name="Calculator" component={CalculatorScreen} />
      <Stack.Screen name="CashHandovers" component={CashHandoversScreen} />
      <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} />
      {__DEV__ ? <Stack.Screen name="KitGallery" component={KitGallery} /> : null}
    </Stack.Navigator>
  );
}
