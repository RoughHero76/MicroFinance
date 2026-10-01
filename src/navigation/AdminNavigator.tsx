// Admin: 5 tabs + More (U-01).

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
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
import CalculatorScreen from '@/features/loans/screens/CalculatorScreen';
import CreateLoanScreen from '@/features/loans/screens/CreateLoanScreen';
import LoansScreen from '@/features/loans/screens/LoansScreen';
import NotificationsScreen from '@/features/notifications/screens/NotificationsScreen';
import PaymentsScreen from '@/features/payments/screens/PaymentsScreen';
import PerformanceScreen from '@/features/reports/screens/PerformanceScreen';
import ReportsScreen from '@/features/reports/screens/ReportsScreen';
import RiskScreen from '@/features/reports/screens/RiskScreen';
import CashHandoversScreen from '@/features/cash/screens/CashHandoversScreen';
import DiagnosticsScreen from '@/features/settings/screens/DiagnosticsScreen';
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
import {FloatingTabBar} from './TabBar';
import {stackScreenOptions, tabOptions, tabScreenOptions, type TabConfig} from './shell';
import type {AdminTabParamList, AppStackParamList} from './types';

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
  const {settings} = useSession();
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
    {key: 'reports', icon: 'chart-bar', title: t('more.reports'), route: 'Reports', visible: can('reports.view')},
    {key: 'risk', icon: 'alert-decagram-outline', title: t('more.risk'), route: 'Risk'},
    {
      key: 'cash',
      icon: 'hand-coin-outline',
      title: t('cash.adminTitle'),
      route: 'CashHandovers',
      visible: !!settings?.modules?.cashHandover,
    },
    {key: 'activity', icon: 'history', title: t('activity.title'), route: 'Activity', visible: can('activity.view')},
    {
      key: 'calculator',
      icon: 'calculator-variant-outline',
      title: t('more.calculator'),
      route: 'Calculator',
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
    <Tab.Navigator screenOptions={tabScreenOptions(theme)} tabBar={props => <FloatingTabBar {...props} />}>
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
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
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
