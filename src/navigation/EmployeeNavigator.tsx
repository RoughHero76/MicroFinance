// Employee: 5 tabs + More (U-01). "Collect" is a tab because recording
// payments is the job employees do most.

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {useCan, useSession} from '@/features/auth/SessionProvider';
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
import CalculatorScreen from '@/features/loans/screens/CalculatorScreen';
import LoanScreen from '@/features/loans/screens/LoanScreen';
import NotificationsScreen from '@/features/notifications/screens/NotificationsScreen';
import MyPaymentsScreen from '@/features/payments/screens/MyPaymentsScreen';
import AboutScreen from '@/features/settings/screens/AboutScreen';
import MoreScreen, {type MoreItem} from '@/features/settings/screens/MoreScreen';
import ProfileScreen from '@/features/settings/screens/ProfileScreen';
import SecurityScreen from '@/features/settings/screens/SecurityScreen';
import SettingsScreen from '@/features/settings/screens/SettingsScreen';
import SupportScreen from '@/features/settings/screens/SupportScreen';
import {useTheme} from '@/theme';
import {FloatingTabBar} from './TabBar';
import {stackScreenOptions, tabOptions, tabScreenOptions, type TabConfig} from './shell';
import type {AppStackParamList, EmployeeTabParamList} from './types';

const Tab = createBottomTabNavigator<EmployeeTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function EmployeeMore() {
  const {t} = useTranslation();
  const {settings} = useSession();
  const items: MoreItem[] = [
    {key: 'payments', icon: 'cash-check', title: t('more.myPayments'), route: 'MyPayments'},
    {key: 'overdue', icon: 'alert-decagram-outline', title: t('overdue.title'), route: 'Overdue'},
    {
      key: 'cash',
      icon: 'hand-coin-outline',
      title: t('cash.title'),
      route: 'CashHandover',
      visible: !!settings?.modules?.cashHandover,
    },
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

function EmployeeTabs() {
  const theme = useTheme();
  const {t} = useTranslation();
  const can = useCan();
  const tabs: TabConfig<keyof EmployeeTabParamList>[] = [
    {
      name: 'Home',
      label: t('nav.home'),
      icon: 'home-outline',
      iconFocused: 'home',
      component: EmployeeHomeScreen,
      header: false,
    },
    {
      name: 'Collect',
      label: t('nav.collect'),
      icon: 'hand-coin-outline',
      iconFocused: 'hand-coin',
      component: CollectScreen,
      header: false,
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
      name: 'Leads',
      label: t('nav.leads'),
      icon: 'account-search-outline',
      iconFocused: 'account-search',
      component: LeadListScreen,
      header: false,
      visible: brand.features.leads && can('lead.create'),
    },
    {
      name: 'More',
      label: t('nav.more'),
      icon: 'dots-horizontal-circle-outline',
      iconFocused: 'dots-horizontal-circle',
      component: EmployeeMore,
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
    </Stack.Navigator>
  );
}
