// Employee: 5 tabs + More (U-01). "Collect" is a tab because recording
// payments is the job employees do most.

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import KitGallery from '@/dev/KitGallery';
import CollectScreen from '@/features/collect/screens/CollectScreen';
import EmployeeHomeScreen from '@/features/collect/screens/EmployeeHomeScreen';
import OverdueListScreen from '@/features/collect/screens/OverdueListScreen';
import CustomerListScreen from '@/features/customers/screens/CustomerListScreen';
import CustomerProfileScreen from '@/features/customers/screens/CustomerProfileScreen';
import SearchScreen from '@/features/customers/screens/SearchScreen';
import LeadDetailScreen from '@/features/leads/screens/LeadDetailScreen';
import LeadListScreen from '@/features/leads/screens/LeadListScreen';
import NewLeadScreen from '@/features/leads/screens/NewLeadScreen';
import HandOverScreen from '@/features/cash/screens/HandOverScreen';
import LoginsScreen from '@/features/staff/screens/LoginsScreen';
import CalculatorScreen from '@/features/loans/screens/CalculatorScreen';
import LoanScreen from '@/features/loans/screens/LoanScreen';
import NotificationsScreen from '@/features/notifications/screens/NotificationsScreen';
import MyPaymentsScreen from '@/features/payments/screens/MyPaymentsScreen';
import AboutScreen from '@/features/settings/screens/AboutScreen';
import MoreScreen from '@/features/settings/screens/MoreScreen';
import ProfileScreen from '@/features/settings/screens/ProfileScreen';
import SecurityScreen from '@/features/settings/screens/SecurityScreen';
import SettingsScreen from '@/features/settings/screens/SettingsScreen';
import SupportScreen from '@/features/settings/screens/SupportScreen';
import {useTheme} from '@/theme';
import {AppTabBar} from './AppTabBar';
import {useEmployeeNav} from './navItems';
import {stackScreenOptions, tabOptions, tabScreenOptions} from './shell';
import {withSplit} from './SplitView';
import type {AppStackParamList, EmployeeTabParamList} from './types';

const Tab = createBottomTabNavigator<EmployeeTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

const CustomersList = withSplit(CustomerListScreen, {Customer: CustomerProfileScreen, Loan: LoanScreen});
const LeadsList = withSplit(LeadListScreen, {Lead: LeadDetailScreen});

function EmployeeMore() {
  const {work} = useEmployeeNav();
  return <MoreScreen work={work} />;
}

const TAB_SCREENS: Record<keyof EmployeeTabParamList, React.ComponentType<any>> = {
  Home: EmployeeHomeScreen,
  Collect: CollectScreen,
  Customers: CustomersList,
  Leads: LeadsList,
  More: EmployeeMore,
};

function EmployeeTabs() {
  const theme = useTheme();
  const {tabs} = useEmployeeNav();
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

export default function EmployeeNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="Tabs" component={EmployeeTabs} />
      <Stack.Screen name="Customer" component={CustomerProfileScreen} />
      <Stack.Screen name="Loan" component={LoanScreen} />
      <Stack.Screen name="Overdue" component={OverdueListScreen} />
      <Stack.Screen name="MyPayments" component={MyPaymentsScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      {__DEV__ ? <Stack.Screen name="KitGallery" component={KitGallery} /> : null}
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Lead" component={LeadDetailScreen} />
      <Stack.Screen name="NewLead" component={NewLeadScreen} />
      <Stack.Screen name="Calculator" component={CalculatorScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="CashHandover" component={HandOverScreen} />
      <Stack.Screen name="Logins" component={LoginsScreen} />
    </Stack.Navigator>
  );
}
