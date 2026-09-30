// Admin: 5 tabs + More (U-01). Old screens still mounted here are replaced
// in W5 (reports, risk and calculator).

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
import CustomerFormScreen from '@/features/customers/screens/CustomerFormScreen';
import CustomerListScreen from '@/features/customers/screens/CustomerListScreen';
import CustomerProfileScreen from '@/features/customers/screens/CustomerProfileScreen';
import SearchScreen from '@/features/customers/screens/SearchScreen';
import AdminHomeScreen from '@/features/dashboard/screens/AdminHomeScreen';
import LeadDetailScreen from '@/features/leads/screens/LeadDetailScreen';
import LeadListScreen from '@/features/leads/screens/LeadListScreen';
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
import EmployeeFormScreen from '@/features/staff/screens/EmployeeFormScreen';
import EmployeeProfileScreen from '@/features/staff/screens/EmployeeProfileScreen';
import EmployeesScreen from '@/features/staff/screens/EmployeesScreen';
import {useTheme} from '@/theme';
import {oldScreen, stackScreenOptions, tabOptions, tabScreenOptions, type TabConfig} from './shell';
import type {AdminTabParamList, AppStackParamList} from './types';

// Old screens (replaced wave by wave).
import ReportsScreen from '../Screens/Home/Reports/ReportsScreen.js';
import NpaReportScreen from '../Screens/Shared/Report/NpaReportScreen.js';
import LoanStatusDetailsScreen from '../Screens/Shared/Report/LoanStatusDetailsScreen.js';
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
      route: 'Employees',
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
      component: CustomerListScreen,
      header: false,
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
      name: 'Leads',
      label: t('nav.leads'),
      icon: 'account-search-outline',
      iconFocused: 'account-search',
      component: LeadListScreen,
      header: false,
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
      <Stack.Screen name="Customer" component={CustomerProfileScreen} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Lead" component={LeadDetailScreen} />
      <Stack.Screen name="Employees" component={EmployeesScreen} />
      <Stack.Screen name="Employee" component={EmployeeProfileScreen} />
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
      {__DEV__ ? <Stack.Screen name="KitGallery" component={KitGallery} /> : null}
      {/* Old route names still used by old screens, pointing at new ones. */}
      <Stack.Screen name="LoanDetails" component={AdminLoanScreen} />
      <Stack.Screen name="RepaymentSchedule" component={LoanScheduleAlias} />
      <Stack.Screen name="RepaymentApprovalScreen" component={PaymentsScreen} />
      {/* Old screens */}
      <Stack.Screen name="ReportsScreen" component={ReportsScreen} options={oldScreen(t('more.reports'))} />
      <Stack.Screen name="NpaReportScreen" component={NpaReportScreen} options={oldScreen(t('more.risk'))} />
      <Stack.Screen
        name="LoanStatusDetails"
        component={LoanStatusDetailsScreen}
        options={oldScreen('Loan Status Details')}
      />
      <Stack.Screen name="LoanCalculator" component={LoanCalculator} options={oldScreen(t('more.calculator'))} />
    </Stack.Navigator>
  );
}
