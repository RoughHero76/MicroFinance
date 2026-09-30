// Admin: 5 tabs + More (U-01). Old screens still mounted here are replaced
// by later waves (customers, staff and leads W4; reports, risk, search and
// calculator W5).

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useRoute} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import KitGallery from '@/dev/KitGallery';
import OverdueListScreen from '@/features/collect/screens/OverdueListScreen';
import AdminHomeScreen from '@/features/dashboard/screens/AdminHomeScreen';
import {adminLoanKeys, getAdminDashboard} from '@/features/loans/adminApi';
import AdminLoanScreen from '@/features/loans/screens/AdminLoanScreen';
import CloseLoanScreen from '@/features/loans/screens/CloseLoanScreen';
import CreateLoanScreen from '@/features/loans/screens/CreateLoanScreen';
import LoansScreen from '@/features/loans/screens/LoansScreen';
import PaymentsScreen from '@/features/payments/screens/PaymentsScreen';
import AboutScreen from '@/features/settings/screens/AboutScreen';
import ActivityScreen from '@/features/settings/screens/ActivityScreen';
import BusinessSettingsScreen from '@/features/settings/screens/BusinessSettingsScreen';
import MoreScreen, {type MoreItem} from '@/features/settings/screens/MoreScreen';
import ProfileScreen from '@/features/settings/screens/ProfileScreen';
import SecurityScreen from '@/features/settings/screens/SecurityScreen';
import SettingsScreen from '@/features/settings/screens/SettingsScreen';
import SupportScreen from '@/features/settings/screens/SupportScreen';
import {useTheme} from '@/theme';
import {oldScreen, stackScreenOptions, tabOptions, tabScreenOptions, type TabConfig} from './shell';
import type {AdminTabParamList, AppStackParamList} from './types';

// Old screens (replaced wave by wave).
import AllCustomerView from '../Screens/Home/CustomerView/AllCustomerView.js';
import CustomerView from '../Screens/Home/CustomerView/CustomerView.js';
import EditCustomerScreen from '../Screens/Home/CustomerView/EditCustomerView.js';
import CustomerRegistration from '../Screens/Home/CustomerView/CustomerRegistration.js';
import PaymentHistory from '../Screens/Shared/Customer/Loan/PaymentHistory.js';
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

function useAdminBadges() {
  const {status} = useSession();
  const query = useQuery({
    queryKey: adminLoanKeys.dashboard,
    queryFn: getAdminDashboard,
    enabled: status === 'signedIn',
    staleTime: 60 * 1000,
    meta: {persist: true},
  });
  return {payments: query.data?.pendingRepayments ?? 0, loans: query.data?.pendingLoans ?? 0};
}

function AdminMore() {
  const {t} = useTranslation();
  const can = useCan();
  const badges = useAdminBadges();
  const items: MoreItem[] = [
    {key: 'payments', icon: 'cash-check', title: t('more.payments'), route: 'Payments', badge: badges.payments},
    {
      key: 'employees',
      icon: 'account-tie-outline',
      title: t('more.employees'),
      route: 'AllEmployeeView',
      visible: can('employee.manage'),
    },
    {key: 'reports', icon: 'chart-bar', title: t('more.reports'), route: 'ReportsScreen', visible: can('reports.view')},
    {key: 'risk', icon: 'alert-decagram-outline', title: t('more.risk'), route: 'NpaReportScreen'},
    {key: 'activity', icon: 'history', title: t('activity.title'), route: 'Activity', visible: can('activity.view')},
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
  const badges = useAdminBadges();
  const search = {icon: 'magnify', label: t('common.search'), route: 'SearchScreen'};
  const tabs: TabConfig<keyof AdminTabParamList>[] = [
    {
      name: 'Home',
      label: t('nav.home'),
      icon: 'home-outline',
      iconFocused: 'home',
      component: AdminHomeScreen,
      header: false,
      badge: badges.payments,
    },
    {
      name: 'Customers',
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
      name: 'Loans',
      label: t('nav.loans'),
      icon: 'bank-outline',
      iconFocused: 'bank',
      component: LoansScreen,
      header: false,
      badge: badges.loans,
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

// Old screens still open a loan's schedule by its old route name.
function LoanScheduleAlias() {
  const route = useRoute();
  (route.params as {tab?: string}).tab = 'schedule';
  return <AdminLoanScreen />;
}

export default function AdminNavigator() {
  const theme = useTheme();
  const {t} = useTranslation();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="Tabs" component={AdminTabs} />
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
      {__DEV__ ? <Stack.Screen name="KitGallery" component={KitGallery} /> : null}
      {/* Old route names still used by old screens, pointing at new ones. */}
      <Stack.Screen name="LoanDetails" component={AdminLoanScreen} />
      <Stack.Screen name="RepaymentSchedule" component={LoanScheduleAlias} />
      <Stack.Screen name="RepaymentApprovalScreen" component={PaymentsScreen} />
      {/* Old screens */}
      <Stack.Screen name="Customer" component={CustomerView} options={oldScreen('Customer View')} />
      <Stack.Screen name="CustomerView" component={CustomerView} options={oldScreen('Customer View')} />
      <Stack.Screen name="EditCustomer" component={EditCustomerScreen} options={oldScreen('Edit Customer')} />
      <Stack.Screen
        name="CustomerRegistration"
        component={CustomerRegistration}
        options={oldScreen('Customer Registration')}
      />
      <Stack.Screen name="PaymentHistory" component={PaymentHistory} options={oldScreen('Payment History')} />
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
