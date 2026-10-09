// What each role's tabs and "More" list contain (U-01, A20, E12), in one
// place: the navigators build their screens from it and the web sidebar
// shows the same entries.

import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {adminLoanKeys, getAdminDashboard} from '@/features/loans/adminApi';
import type {MoreItem} from '@/features/settings/screens/MoreScreen';
import type {TabMeta} from './shell';
import type {AdminTabParamList, EmployeeTabParamList} from './types';

export function useAdminBadges() {
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

export interface RoleNav<Tabs extends string> {
  tabs: TabMeta<Tabs>[];
  /** The "More" screen's working items (Payments, Reports…). */
  work: MoreItem[];
}

export function useAdminNav(): RoleNav<keyof AdminTabParamList> {
  const {t} = useTranslation();
  const can = useCan();
  const {settings} = useSession();
  const badges = useAdminBadges();
  const work: MoreItem[] = [
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
      key: 'send',
      icon: 'bullhorn-outline',
      title: t('send.title'),
      route: 'SendNotification',
      visible: can('employee.manage'),
    },
    {
      key: 'calculator',
      icon: 'calculator-variant-outline',
      title: t('more.calculator'),
      route: 'Calculator',
      visible: brand.features.calculator,
    },
  ];
  const tabs: TabMeta<keyof AdminTabParamList>[] = [
    {
      name: 'Home',
      label: t('nav.home'),
      icon: 'home-outline',
      iconFocused: 'home',
      header: false,
      badge: badges.payments,
    },
    {
      name: 'Customers',
      label: t('nav.customers'),
      icon: 'account-group-outline',
      iconFocused: 'account-group',
      header: false,
    },
    {
      name: 'Loans',
      label: t('nav.loans'),
      icon: 'bank-outline',
      iconFocused: 'bank',
      header: false,
      badge: badges.loans,
    },
    {
      name: 'Leads',
      label: t('nav.leads'),
      icon: 'account-search-outline',
      iconFocused: 'account-search',
      header: false,
      visible: brand.features.leads && can('lead.manage'),
    },
    {
      name: 'More',
      label: t('nav.more'),
      icon: 'dots-horizontal-circle-outline',
      iconFocused: 'dots-horizontal-circle',
      header: false,
    },
  ];
  return {tabs, work};
}

export function useEmployeeNav(): RoleNav<keyof EmployeeTabParamList> {
  const {t} = useTranslation();
  const can = useCan();
  const {settings} = useSession();
  const work: MoreItem[] = [
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
  const tabs: TabMeta<keyof EmployeeTabParamList>[] = [
    {name: 'Home', label: t('nav.home'), icon: 'home-outline', iconFocused: 'home', header: false},
    {name: 'Collect', label: t('nav.collect'), icon: 'hand-coin-outline', iconFocused: 'hand-coin', header: false},
    {
      name: 'Customers',
      label: t('nav.customers'),
      icon: 'account-group-outline',
      iconFocused: 'account-group',
      header: false,
    },
    {
      name: 'Leads',
      label: t('nav.leads'),
      icon: 'account-search-outline',
      iconFocused: 'account-search',
      header: false,
      visible: brand.features.leads && can('lead.create'),
    },
    {
      name: 'More',
      label: t('nav.more'),
      icon: 'dots-horizontal-circle-outline',
      iconFocused: 'dots-horizontal-circle',
      header: false,
    },
  ];
  return {tabs, work};
}
