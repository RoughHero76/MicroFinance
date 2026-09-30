// Admin: 5 tabs + More (U-01). Old screens are mounted inside the new tabs
// until their wave replaces them (W1). All of the admin's routes are here.

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {useCan} from '@/features/auth/SessionProvider';
import KitGallery from '@/dev/KitGallery';
import AboutScreen from '@/features/settings/screens/AboutScreen';
import MoreScreen, {type MoreItem} from '@/features/settings/screens/MoreScreen';
import ProfileScreen from '@/features/settings/screens/ProfileScreen';
import SecurityScreen from '@/features/settings/screens/SecurityScreen';
import SettingsScreen from '@/features/settings/screens/SettingsScreen';
import SupportScreen from '@/features/settings/screens/SupportScreen';
import {useTheme} from '@/theme';
import {oldScreen, stackScreenOptions, tabOptions, tabScreenOptions, type TabConfig} from './shell';
import type {AdminTabParamList, AppStackParamList} from './types';

// Old screens (replaced wave by wave).
import HomeScreen from '../Screens/Home/HomeScreen.js';
import AllCustomerView from '../Screens/Home/CustomerView/AllCustomerView.js';
import CustomerView from '../Screens/Home/CustomerView/CustomerView.js';
import EditCustomerScreen from '../Screens/Home/CustomerView/EditCustomerView.js';
import CustomerRegistration from '../Screens/Home/CustomerView/CustomerRegistration.js';
import LoansView from '../Screens/Home/CustomerView/Loans/LoansView.js';
import LoanDetails from '../Screens/Home/CustomerView/Loans/LoanDetails.js';
import RepaymentSchedule from '../Screens/Home/CustomerView/Loans/RepaymentSchedule.js';
import CreateLoan from '../Screens/Home/CustomerView/Loans/CreateLoan.js';
import CloseLoan from '../Screens/Home/CustomerView/Loans/CloseLoan.js';
import PaymentHistory from '../Screens/Shared/Customer/Loan/PaymentHistory.js';
import RepaymentApprovalScreen from '../Screens/Home/CustomerView/RepaymentApprovalScreen.js';
import ReportsScreen from '../Screens/Home/Reports/ReportsScreen.js';
import NpaReportScreen from '../Screens/Shared/Report/NpaReportScreen.js';
import LoanStatusDetailsScreen from '../Screens/Shared/Report/LoanStatusDetailsScreen.js';
import AllEmployeeView from '../Screens/Home/EmployeeView/AllEmployeeView.js';
import EmployeeView from '../Screens/Home/EmployeeView/EmployeeView.js';
import EditEmployeeView from '../Screens/Home/EmployeeView/EditEmployeeView.js';
import EmployeeRegistration from '../Screens/Home/EmployeeView/EmployeeRegistration.js';
import AdminLeadsScreen from '../Screens/Home/Leads/AdminLeads.js';
import SearchScreen from '../Screens/Shared/Searching/SearchScreen.js';
import LoanCalculator from '../Screens/Shared/LoanCalculator.js';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function AdminMore() {
  const {t} = useTranslation();
  const can = useCan();
  const items: MoreItem[] = [
    {key: 'payments', icon: 'cash-check', title: t('more.payments'), route: 'RepaymentApprovalScreen'},
    {
      key: 'employees',
      icon: 'account-tie-outline',
      title: t('more.employees'),
      route: 'AllEmployeeView',
      visible: can('employee.manage'),
    },
    {key: 'reports', icon: 'chart-bar', title: t('more.reports'), route: 'ReportsScreen', visible: can('reports.view')},
    {key: 'risk', icon: 'alert-decagram-outline', title: t('more.risk'), route: 'NpaReportScreen'},
    {
      key: 'calculator',
      icon: 'calculator-variant-outline',
      title: t('more.calculator'),
      route: 'LoanCalculator',
      visible: brand.features.calculator,
    },
  ];
  return <MoreScreen work={items} />;
}

function AdminTabs() {
  const theme = useTheme();
  const {t} = useTranslation();
  const can = useCan();
  const search = {icon: 'magnify', label: t('common.search'), route: 'SearchScreen'};
  const tabs: TabConfig<keyof AdminTabParamList>[] = [
    {
      name: 'Home',
      label: t('nav.home'),
      icon: 'home-outline',
      iconFocused: 'home',
      component: HomeScreen,
      header: {title: brand.name, right: [search]},
    },
    {
      name: 'AllCustomerView',
      label: t('nav.customers'),
      icon: 'account-group-outline',
      iconFocused: 'account-group',
      component: AllCustomerView,
      header: {
        title: t('nav.customers'),
        right: [search, {icon: 'account-plus-outline', label: t('common.add'), route: 'CustomerRegistration'}],
      },
    },
    {
      name: 'LoansView',
      label: t('nav.loans'),
      icon: 'bank-outline',
      iconFocused: 'bank',
      component: LoansView,
      header: {title: t('nav.loans'), right: [search]},
    },
    {
      name: 'AdminLeadsScreen',
      label: t('nav.leads'),
      icon: 'account-search-outline',
      iconFocused: 'account-search',
      component: AdminLeadsScreen,
      header: {title: t('nav.leads')},
      visible: brand.features.leads && can('lead.manage'),
    },
    {
      name: 'More',
      label: t('nav.more'),
      icon: 'dots-horizontal-circle-outline',
      iconFocused: 'dots-horizontal-circle',
      component: AdminMore,
      header: false,
    },
  ];
  return (
    <Tab.Navigator screenOptions={tabScreenOptions(theme)}>
      {tabs
        .filter(tab => tab.visible !== false)
        .map(tab => (
          <Tab.Screen key={tab.name} name={tab.name} component={tab.component} options={tabOptions(tab)} />
        ))}
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  const theme = useTheme();
  const {t} = useTranslation();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="Tabs" component={AdminTabs} />
      {/* New shared screens */}
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      {__DEV__ ? <Stack.Screen name="KitGallery" component={KitGallery} /> : null}
      {/* Old screens */}
      <Stack.Screen name="CustomerView" component={CustomerView} options={oldScreen('Customer View')} />
      <Stack.Screen name="EditCustomer" component={EditCustomerScreen} options={oldScreen('Edit Customer')} />
      <Stack.Screen
        name="CustomerRegistration"
        component={CustomerRegistration}
        options={oldScreen('Customer Registration')}
      />
      <Stack.Screen name="RepaymentSchedule" component={RepaymentSchedule} options={oldScreen('Repayment Schedule')} />
      <Stack.Screen name="CreateLoan" component={CreateLoan} options={oldScreen('Create Loan')} />
      <Stack.Screen name="LoanDetails" component={LoanDetails} options={oldScreen('Loan Details')} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistory} options={oldScreen('Payment History')} />
      <Stack.Screen name="CloseLoan" component={CloseLoan} options={oldScreen('Close Loan')} />
      <Stack.Screen
        name="RepaymentApprovalScreen"
        component={RepaymentApprovalScreen}
        options={oldScreen(t('more.payments'))}
      />
      <Stack.Screen name="ReportsScreen" component={ReportsScreen} options={oldScreen(t('more.reports'))} />
      <Stack.Screen name="NpaReportScreen" component={NpaReportScreen} options={oldScreen(t('more.risk'))} />
      <Stack.Screen
        name="LoanStatusDetails"
        component={LoanStatusDetailsScreen}
        options={oldScreen('Loan Status Details')}
      />
      <Stack.Screen
        name="AllEmployeeView"
        component={AllEmployeeView}
        options={oldScreen(t('more.employees'), [
          {icon: 'account-plus-outline', label: t('common.add'), route: 'EmployeeRegistration'},
        ])}
      />
      <Stack.Screen name="EmployeeView" component={EmployeeView} options={oldScreen('Employee Profile')} />
      <Stack.Screen name="EditEmployee" component={EditEmployeeView} options={oldScreen('Edit Employee')} />
      <Stack.Screen
        name="EmployeeRegistration"
        component={EmployeeRegistration}
        options={oldScreen('Employee Registration')}
      />
      <Stack.Screen name="SearchScreen" component={SearchScreen} options={oldScreen(t('common.search'))} />
      <Stack.Screen name="LoanCalculator" component={LoanCalculator} options={oldScreen(t('more.calculator'))} />
    </Stack.Navigator>
  );
}
