// Employee: 5 tabs + More (U-01). "Collect" is a tab because recording
// payments is the job employees do most. Old screens still mounted here are
// replaced by later waves (leads W4, search and calculator W5).

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {useCan} from '@/features/auth/SessionProvider';
import KitGallery from '@/dev/KitGallery';
import CollectScreen from '@/features/collect/screens/CollectScreen';
import EmployeeHomeScreen from '@/features/collect/screens/EmployeeHomeScreen';
import OverdueListScreen from '@/features/collect/screens/OverdueListScreen';
import CustomerListScreen from '@/features/customers/screens/CustomerListScreen';
import CustomerProfileScreen from '@/features/customers/screens/CustomerProfileScreen';
import LoanScreen from '@/features/loans/screens/LoanScreen';
import MyPaymentsScreen from '@/features/payments/screens/MyPaymentsScreen';
import AboutScreen from '@/features/settings/screens/AboutScreen';
import MoreScreen, {type MoreItem} from '@/features/settings/screens/MoreScreen';
import ProfileScreen from '@/features/settings/screens/ProfileScreen';
import SecurityScreen from '@/features/settings/screens/SecurityScreen';
import SettingsScreen from '@/features/settings/screens/SettingsScreen';
import SupportScreen from '@/features/settings/screens/SupportScreen';
import {useTheme} from '@/theme';
import {oldScreen, stackScreenOptions, tabOptions, tabScreenOptions, type TabConfig} from './shell';
import type {AppStackParamList, EmployeeTabParamList} from './types';

// Old screens (replaced wave by wave).
import SearchScreen from '../Screens/Shared/Searching/SearchScreen.js';
import LoanCalculator from '../Screens/Shared/LoanCalculator.js';
import LeadListScreen from '../Screens/Shared/Leads/EmployeeLeadScreen.js';
import CreateLeadScreen from '../Screens/Shared/Leads/EmployeeCreateLead.js';
import LeadDetailsScreen from '../Screens/Shared/Leads/EmployeeLeadDetails.js';

const Tab = createBottomTabNavigator<EmployeeTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function EmployeeMore() {
  const {t} = useTranslation();
  const items: MoreItem[] = [
    {key: 'payments', icon: 'cash-check', title: t('more.myPayments'), route: 'MyPayments'},
    {key: 'overdue', icon: 'alert-decagram-outline', title: t('overdue.title'), route: 'Overdue'},
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
      name: 'LeadListScreen',
      label: t('nav.leads'),
      icon: 'account-search-outline',
      iconFocused: 'account-search',
      component: LeadListScreen,
      header: {title: t('nav.myLeads'), right: [{icon: 'plus', label: t('common.add'), route: 'CreateLeadScreen'}]},
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
    <Tab.Navigator screenOptions={tabScreenOptions(theme)}>
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
  const {t} = useTranslation();
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
      {/* The old search opens customers as 'CustomerView' until W4 replaces it. */}
      <Stack.Screen name="CustomerView" component={CustomerProfileScreen} />
      <Stack.Screen name="SearchScreen" component={SearchScreen} options={oldScreen(t('common.search'))} />
      <Stack.Screen name="LoanCalculator" component={LoanCalculator} options={oldScreen(t('more.calculator'))} />
      <Stack.Screen name="LeadDetailsScreen" component={LeadDetailsScreen} options={oldScreen('Lead Details')} />
      <Stack.Screen name="CreateLeadScreen" component={CreateLeadScreen} options={oldScreen('Create Lead')} />
    </Stack.Navigator>
  );
}
